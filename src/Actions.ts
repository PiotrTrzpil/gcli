import 'reflect-metadata';
import 'source-map-support/register';
import Printer from './utils/Printer';
import SchemaConnection from './SchemaConnection';
import { QueryRunner } from './QueryRunner';
import { ApiLoader } from './ApiLoader';
import * as _ from 'lodash';
import { FieldInterpreter } from './FieldInterpreter';
import { Diagnostics } from './Diagnostics';


export default class Actions {
  private global: ProgramOptions;
  private readonly schemaLoader: SchemaConnection;
  private outputJson = false;
  private queryRunner!: QueryRunner;
  private projLoader: ApiLoader;
  public binName: string;
  private interpreter: FieldInterpreter;

  constructor(
    private diagnostics: Diagnostics,
    global: ProgramOptions,
    projLoader: ApiLoader,
    schemaLoader: SchemaConnection,
  ) {
    this.binName = 'gcli';
    this.global = global;
    this.schemaLoader = schemaLoader;
    this.projLoader = projLoader;
    this.interpreter = new FieldInterpreter(this, diagnostics);
    this.queryRunner = new QueryRunner(this.diagnostics, this.schemaLoader);
  }

  configureOuput(argv: any) {
    this.outputJson = argv.argv.json;
  }

  async interpretCommands(inputArgs: string[], argv: any): Promise<string> {

    this.configureOuput(argv);

    Printer.debug(argv);
    const apiName = argv.argv._[0];

    const slicedArgs = inputArgs.slice(1);

    if (!_.isString(apiName)) {
      const sywacother = require('sywac/api').get()
        .outputSettings({ maxWidth: 175 })
        .help('-h, --help')
        .usage(`Usage: ${this.binName} <api-name> <field> ...`);
      const parsed = await sywacother.parse(inputArgs);
      return parsed.output;
    }

    const schema = await this.queryRunner.loadSchema(apiName);

    const sywacother = require('sywac/api').get()
      .outputSettings({ maxWidth: 175 })
      .help('-h, --help')
      .usage(`Usage: ${this.binName} ${apiName} <field> ...`);

    const results = new FieldInterpreter(this, this.diagnostics).run(sywacother, apiName, schema);
    const parsed = await sywacother.parse(slicedArgs);

    // Printer.debug('RESULT:', parsed);
    if (parsed.output) {
      return parsed.output;
    } else {
      const result = await results.getQueryRunner().run(this.queryRunner);
      return result.toOutput()
    }
  }

  public async runOn(args: string[] | undefined): Promise<string> {
    let sywac = require('sywac/api').get();
    for (const key of this.projLoader.getProjectNames()) {
      sywac = sywac
        .command(key, {
          run: async (arg1: any, context: any) => {
            Printer.debug("RUN:", arg1)
          }
        });
    }

    const resolvedArgs = args || process.argv;
    Printer.debug('resolvedArgs:', resolvedArgs);

    const argv = await sywac
      .showHelpByDefault()
      .boolean('-d, --debug', { desc: 'Enable debug logging' })
      .boolean('--json', { desc: 'Enable json output' })
      .outputSettings({ maxWidth: 175 })
      .parse(resolvedArgs.slice(1));

    if (argv.output !== '') {
      return argv.output;
    }
    // console.log('Top-level output: ')
    // console.log(util.inspect(argv, true, 999))
    // console.log(argv.output)

    if (argv.argv.debug) {
      process.env.DEBUG_ENABLED = 'true';
      process.env.DEBUG_COLORS = 'true';
    }
    Printer.debug('Input args:', argv.details.args);

    const newArgs = argv.details.args.filter((arg: string) => arg !== '--debug' && arg !== '--json');
    // Printer.debug('newArgs:', newArgs);
    // const slicedArgs = resolvedArgs.slice(0, 2).concat(newArgs.slice(1)).slice(2);
    Printer.debug('Changed args to:', newArgs);
    return this.interpretCommands(newArgs, argv);
  }
}

export interface ProgramOptions {
  awsProfile?: string;
  awsRegion?: string;
  debug?: boolean;
}


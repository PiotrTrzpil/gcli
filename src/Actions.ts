import 'source-map-support/register';

import { GraphQLNamedType, GraphQLScalarType, printSchema } from 'graphql';
import { getGraphQLConfig, resolveEnvsInValues } from 'graphql-config';
import Printer from './Printer';
import {
  GraphQLField,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLOutputType,
} from 'graphql/type/definition';
import SchemaLoader from './SchemaLoader';
import { QueryResult, QueryRunner } from './QueryRunner';
import { ProjectLoader } from './ProjectLoader';
import * as util from 'util';

const binName = 'gcli';


export interface ResultAccumulator {
  results: CommandRunnerHolder[]
}

export class CommandRunnerHolder {
  runner?: CommandRunner
}
export class CommandRunner {
  private selectionPath: string[];
  private fieldType: GraphQLNamedType;
  private context: any;

  constructor(context: any,
              fieldType: GraphQLNamedType,
              selectionPath: string[]) {
    this.selectionPath = selectionPath;
    this.context = context;
    this.fieldType = fieldType;
  }


  async run(queryRunner: QueryRunner) {
    const fixedSelectionPath = this.selectionPath; // newSelectionPath.slice(1);
    Printer.debug('Running command:', fixedSelectionPath);
    // Printer.debug(context);

    const args = this.resolveArgs(this.context, fixedSelectionPath);

    Printer.debug('Got args:', args);
    return queryRunner.runQuery(true, fixedSelectionPath, this.fieldType, args);
  }


  resolveArgs(context: any, selectionPath: string[]) {

    const flags = context.details.types.filter((type: any) => type.source === 'flag');
    Printer.debug(flags);
    const args: any = {};
    for (const index in selectionPath) {
      const pathPart = selectionPath[index];
      const foundTypes = flags.filter((type: any) => type.parent && type.parent.endsWith(' ' + pathPart));
      if (foundTypes.length > 0) {
        args[pathPart] = foundTypes.map((type: any) => ({
          name: type.aliases[0],
          type: type.datatype,
          value: type.value,
        }));
      }
    }
    return args;
  }
}

export default class Actions {
  private global: ProgramOptions;
  private readonly schemaLoader: SchemaLoader;
  private outputJson = false;
  private queryRunner!: QueryRunner;
  private projLoader: ProjectLoader;

  constructor(global: ProgramOptions,
              projLoader: ProjectLoader,
              schemaLoader: SchemaLoader,
              // queryRunner: QueryRunner,
  ) {
    this.global = global;
    this.schemaLoader = schemaLoader;
    this.projLoader = projLoader;
    // this.queryRunner = queryRunner;
  }

  configureOuput(argv: any) {
    this.outputJson = argv.argv.json;
  }

  setArguments(sywacInner: any, args: any[]) {
    Printer.debug('Setting arguments', args.map((arg: any) => arg.name));
    args.forEach((arg: any) => {
      sywacInner.string(`--${arg.name}`, {
        desc: arg.description || '',
        group: 'Arguments:',
      });
      // flags: `--${arg.name}`,
      // required: false,
      // desc: arg.description || '',
      // // type: 'number',
      // hint: ''
    });
    // sywacInner.boolean('-u, --untracked', { desc: 'Include untracked changes' })
  }

  interpretField(sywac: any, selectionPath: string[], selectionArgs: any[], currentType: GraphQLObjectType, aField: GraphQLField<any, any>, accumulator: ResultAccumulator): void {
    const fieldName = aField.name;
    const type: GraphQLOutputType = aField.type;
    const fieldType = aField.type as GraphQLNamedType;
    const fieldTypeNonNull = aField.type as GraphQLNonNull<any>;
    let fieldTypeNamed;
    if (fieldTypeNonNull && fieldTypeNonNull.ofType && fieldTypeNonNull.ofType.name) {
      fieldTypeNamed = fieldTypeNonNull.ofType;
    }

    let usage = `Usage: ${binName} ${selectionPath.join(' ')} <field> ...`;
    const commandPart = '';
    if (currentType.name && currentType.name.match(/.+Connection$/)) {
      // commandPart = ' --first'
      usage = `Usage: ${binName} ${selectionPath.join(' ')} --first 10`;
    }
    const params = undefined;
    // if (aField.args && aField.args.length > 0) { //   fieldTypeNamed && fieldTypeNamed.name.match(/.+Connection$/)) { // fieldName === 'repositories') {
    //   params = aField.args.map(arg => ({
    //     flags: `--${arg.name}`,
    //     required: false,
    //     desc: arg.description || '',
    //     // type: 'number',
    //     hint: ''
    //   }))
    // }
    const newSelectionPath = selectionPath.concat([fieldName]);

    Printer.debug('Setting up command:', `${fieldName}${commandPart}`);

    const holder: CommandRunnerHolder = {};
    sywac
      .usage(usage)
      .command(`${fieldName}${commandPart}`, {
        ignore: ['wat'],
        group: 'Fields:',
        params: params,
        // paramsDescription: 'dadaddaada',
        // params: [{
        //   flags: '--what [what=10]',
        //   desc: 'What would you like on your sandwich?'
        // }],
        hints: '',
        // paramsGroup: 'Bla',
        desc: aField.description,
        setup: (sywacInner: any) => {
          Printer.debug('Setting up subcommand', fieldName);

          const shouldSetArguments = aField.args && aField.args.length > 0;
          if (aField.args && aField.args.length > 0) {
            this.setArguments(sywacInner, aField.args);
          }
          Printer.debug('fieldType', fieldType);
          Printer.debug('fieldTypeNonNull.ofType', fieldTypeNonNull.ofType);

          if (type instanceof GraphQLNonNull) {
            Printer.debug('GraphQLNonNull', type);
            if ((type.ofType as any).getFields) {
              this.genSubcommands(sywacInner, newSelectionPath, selectionArgs, type.ofType as any, accumulator);
            } else {
              Printer.debug('no ofType', type);
            }
          } else if (type instanceof GraphQLScalarType) {
            Printer.debug('GraphQLScalarType', type);
          } else if (type instanceof GraphQLObjectType) {
            Printer.debug('GraphQLObjectType', type);
            this.genSubcommands(sywacInner, newSelectionPath, selectionArgs, type as any, accumulator);
          } else if (type instanceof GraphQLList && (type.ofType as any).getFields) {
            Printer.debug('GraphQLList', type);
            this.genSubcommands(sywacInner, newSelectionPath, selectionArgs, type.ofType as any, accumulator);
          } else {
            Printer.debug('UNKNOWN', type);
            sywacInner
              .usage(`Use this command to access this field (${Printer.insp(fieldType)}): ${binName} ${newSelectionPath.join(' ')} `);
          }
          //
          // if (fieldTypeNonNull.ofType && fieldTypeNonNull.ofType.getFields) {
          //   this.genSubcommands(sywacInner, newSelectionPath, selectionArgs, fieldTypeNonNull.ofType )
          // } else {
          //   sywacInner
          //     .usage(`Use this command to access this field (${Printer.inspect(fieldType)}): ${binName} ${newSelectionPath.join(' ')} ` )
          // }

        },
        run: async (arg1: any, context: any) => {
          const fixedSelectionPath = newSelectionPath.slice(1);
          holder.runner = new CommandRunner(context, fieldType, fixedSelectionPath)

          Printer.debug('Running command:', fixedSelectionPath);
          // // Printer.debug(context);
          //
          // const args = this.resolveArgs(context, fixedSelectionPath);
          //
          // Printer.debug('Got args:', args);
          // const result = await this.queryRunner.runQuery(this.outputJson, fixedSelectionPath, fieldType, args);
          //
          // acc.results.push(result)
          // // resolve(result);
        },
      });

    accumulator.results.push(holder);
  }


  genSubcommands(sywac: any, selectionPath: string[], selectionArgs: any[], type: GraphQLObjectType, accumulator: ResultAccumulator): void {

    // co

    if (type) {
      const fields = type.getFields();
      for (const key in fields) {
        Printer.debug('Working on field:', key)
        const aField = fields[key] as GraphQLField<any, any>;
        this.interpretField(sywac, selectionPath, selectionArgs, type, aField, accumulator);
      }
    }
    // return acc;
  }


  async interpretCommands(argv: any): Promise<string> {

    this.configureOuput(argv);

    // if (argv.argv.default) {
    const apiName = argv.argv.default;
    this.queryRunner = new QueryRunner(this.schemaLoader);
    const schema = await this.queryRunner.loadSchema(argv.argv.default);
    Printer.debug('loaded schema:\n', printSchema(schema))
    const sywacother = require('sywac/api').get()
      .outputSettings({ maxWidth: 175 })
      .help('-h, --help')
      .usage(`Usage: ${binName} ${apiName} <field> ...`);

    if (!schema.getQueryType()) {
      throw new Error('No query type in the schema!')
    }

    const accumulator: ResultAccumulator = {
        results: []
    };

    this.genSubcommands(sywacother, [apiName], [], schema.getQueryType() as any, accumulator);

    const parsed = await sywacother.parse();

    Printer.debug('RESULT:', parsed)

    if (parsed.output) {
      return parsed.output;
    } else {
      const runners: CommandRunner[] = (accumulator.results
        .filter(holder => holder.runner !== undefined)
        .map(holder => holder.runner)) as any as CommandRunner[];

      if (runners.length === 0) {
        throw new Error('dont know what to do')
      } else {
        const result = await runners[0].run(this.queryRunner);
        if (result.validationErrors) {
          return result.validationErrors.map(err => {
            if (err.stack) {
              throw err;
            } else {
              return err.message;
            }
          }).join('\n')
        } else {
          return util.inspect(result.outputObj)
        }
      }

    }


  // } else {
  //   Printer.debug(argv);
  //   console.log('OUTPUT:')
  //   console.log(argv.output)
  //   return ''
  //
  // }

  }

  public async processGraphQLConfig(): Promise<string> {
    let sywac = require('sywac/api').get();

    for (const key in this.projLoader.getProjectNames()) {
      sywac = sywac
        .positional(key, { paramsDesc: 'A required string argument' });
    }
    const argv = await sywac
      .boolean('-d, --debug', { desc: 'Enable debug logging' })
      .boolean('--json', { desc: 'Enable json output' })
      .outputSettings({ maxWidth: 175 })
      .parse();

    // console.log('Top-level output: ')
    // console.log(util.inspect(argv, true, 999))
    // console.log(argv.output)

    // console.dir(argv);

    if (argv.argv.debug) {
      process.env.DEBUG_ENABLED = 'true';
      process.env.DEBUG_COLORS = 'true';
    }

    const newArgs = argv.details.args.filter((arg: string) => arg !== '--debug' && arg !== '--json');

    process.argv = process.argv.slice(0, 2).concat(newArgs.slice(1));
    Printer.debug('Changed args to:', process.argv)
    return this.interpretCommands(argv);
  }

}

export interface ProgramOptions {
  awsProfile?: string;
  awsRegion?: string;
  debug?: boolean;
}

// export interface GenSchemaOptions {
// }

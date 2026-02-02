import {
  GraphQLField, GraphQLList,
  GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLScalarType,
} from 'graphql';
import { CommandRunner, CommandRunnerHolder, ResultAccumulator } from './CommandRunner';
import Printer from './utils/Printer';
import Actions from './Actions';
import { Diagnostics } from './Diagnostics';

export class InterpretationResult {
  constructor(private runnerHolders: CommandRunnerHolder[]) {
  }

  getQueryRunner() {
    const runners: CommandRunner[] = (this.runnerHolders
      .filter(holder => holder.runner !== undefined)
      .map(holder => holder.runner)) as any as CommandRunner[];

    if (runners.length === 0) {
      throw new Error('Failed to accumulate any field interpretation results')
    } else {
      return runners[0];
    }
  }
}


export class Dispatcher {
  constructor(private sywac: any,
              private selectionPath: string[],
              private selectionArgs: any[],
              private currentType: GraphQLObjectType,
              private aField: GraphQLField<any, any>,
              private accumulator: ResultAccumulator) {
  }

  dispatch() {

  }
}

export class FieldInterpreter {

  constructor(
    private actions: Actions,
    private diagnostics: Diagnostics
  ) {}

  public run(sywac: any, apiName: string, schema: any): InterpretationResult {
    const accumulator: ResultAccumulator = {
      results: []
    };
    this.genSubcommands(sywac, [apiName], [], schema.getQueryType() as any, accumulator);
    return new InterpretationResult(accumulator.results);
  }

  private genSubcommands(sywac: any, selectionPath: string[], selectionArgs: any[], type: GraphQLObjectType, accumulator: ResultAccumulator): void {
    if (type) {
      const fields = type.getFields();
      for (const key in fields) {
        Printer.debug('Working on field:', key)
        const aField = fields[key] as GraphQLField<any, any>;
        // const dispatcher = new Dispatcher(sywac, selectionPath, selectionArgs, type, aField, accumulator);
        // dispatcher.run();
        this.interpretField(sywac, selectionPath, selectionArgs, type, aField, accumulator);
      }
    }
  }

  interpretField(sywac: any, selectionPath: string[], selectionArgs: any[], currentType: GraphQLObjectType, aField: GraphQLField<any, any>, accumulator: ResultAccumulator): void {
    const fieldName = aField.name;
    const type: GraphQLOutputType = aField.type;
    const fieldType = aField.type as GraphQLNamedType;

    let usage = `Usage: ${this.actions.binName} ${selectionPath.join(' ')} <field> ...`;
    const commandPart = '';
    if (currentType.name && currentType.name.match(/.+Connection$/)) {
      usage = `Usage: ${this.actions.binName} ${selectionPath.join(' ')} --first 10`;
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
      .command(`${fieldName}${commandPart}`,  {
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

          // const shouldSetArguments = aField.args && aField.args.length > 0;

          if (aField.args && aField.args.length > 0) {
            this.setArguments(sywacInner, aField.args);
          }

          this.diagnostics.logField(aField);

          if (type instanceof GraphQLNonNull) {
            if ((type.ofType as any).getFields) {
              this.genSubcommands(sywacInner, newSelectionPath, selectionArgs, type.ofType as any, accumulator);
            }
          } else if (type instanceof GraphQLScalarType) {
          } else if (type instanceof GraphQLObjectType) {
            this.genSubcommands(sywacInner, newSelectionPath, selectionArgs, type as any, accumulator);
          } else if (type instanceof GraphQLList && (type.ofType as any).getFields) {
            this.genSubcommands(sywacInner, newSelectionPath, selectionArgs, type.ofType as any, accumulator);
          } else {
            sywacInner
              .usage(`Use this command to access this field (${Printer.insp(fieldType)}): ${this.actions.binName} ${newSelectionPath.join(' ')} `);
          }
        },
        run: async (arg1: any, context: any) => {
          const fixedSelectionPath = newSelectionPath.slice(1);
          holder.runner = new CommandRunner(context, type, fixedSelectionPath)

          Printer.debug('Running command:', fixedSelectionPath);
        },
      });

    accumulator.results.push(holder);
  }

  setArguments(sywacInner: any, args: any[]) {
    Printer.debug('Setting arguments', args.map((arg: any) => arg.name));
    args.forEach((arg: any) => {
      sywacInner.string(`--${arg.name}`, {
        desc: arg.description || '',
        group: 'Arguments:',
      });
    });
  }

}
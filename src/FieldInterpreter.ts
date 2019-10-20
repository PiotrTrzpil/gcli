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
  private actions: Actions;

  constructor(actions: Actions) {
    this.actions = actions;
  }

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

  runOnField() {
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

    let usage = `Usage: ${this.actions.binName} ${selectionPath.join(' ')} <field> ...`;
    const commandPart = '';
    if (currentType.name && currentType.name.match(/.+Connection$/)) {
      // commandPart = ' --first'
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
              .usage(`Use this command to access this field (${Printer.insp(fieldType)}): ${this.actions.binName} ${newSelectionPath.join(' ')} `);
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

}
import 'source-map-support/register'

import { DocumentNode, FieldNode, GraphQLNamedType, GraphQLScalarType, GraphQLSchema, GraphQLType, isObjectType, isOutputType, OperationDefinitionNode, printSchema, SelectionNode, SelectionSetNode, validate } from "graphql";
import {
  getGraphQLConfig,
  resolveEnvsInValues,
} from "graphql-config";
import Printer from "./printer";
import { GraphQLEnumType, GraphQLField, GraphQLInterfaceType, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLOutputType, GraphQLUnionType } from "graphql/type/definition";
import * as util from "util";
import SchemaLoader from "./SchemaLoader";
import * as _ from "lodash";

const binName = 'gcli';

export default class Actions {
  private global: ProgramOptions;
  private schemaLoader: SchemaLoader;
  private schema?: GraphQLSchema;
  private outputJson = false;

  constructor(global: ProgramOptions, schemaLoader: SchemaLoader) {
    this.global = global;
    this.schemaLoader = schemaLoader;
  }

  configureOuput(argv: any) {
    this.outputJson = argv.argv.json
  }

  buildSelectionSet(fieldPath: string[], leafType: GraphQLNamedType, args: any): SelectionSetNode | undefined {
    Printer.debug('fieldPath', fieldPath);
    if (fieldPath.length === 0) {
      if (isObjectType(leafType)) {
        return this.selectionSetForType(leafType);
      } else {
        return undefined;
      }
    } else {
      return this.selectionWithSingleField(fieldPath[0], args[fieldPath[0]] || [], this.buildSelectionSet(fieldPath.slice(1), leafType, args));
    }
  }

  getInnermostData(fieldPath: string[], data: any): any {
    if (fieldPath.length === 0) {
      return data;
    } else {

      if (util.isArray(data)) {
        return data.map(elem => {
          return this.getInnermostData(fieldPath, elem);
        })
      } else {
        const newData = data[fieldPath[0]];
        if (!newData) {
          throw new Error('Cannot find ' + fieldPath[0] + ' in: ' + Printer.inspect(data))
        }
        return this.getInnermostData(fieldPath.slice(1), newData);
      }
    }
  }

  async runQuery(fieldPath: string[], type: GraphQLNamedType, args: any) {

    const operation: OperationDefinitionNode = {
      kind: "OperationDefinition",
      operation: 'query',
      selectionSet: this.buildSelectionSet(fieldPath, type, args) as SelectionSetNode
    };


    const doc: DocumentNode = {
      kind: 'Document',
      definitions: [operation]
    };

    // Printer.debug('validating document:', doc)
    const errors = validate(this.schema as GraphQLSchema, doc);
    if (errors.length > 0) {
      Printer.debug('Got validation erorrs', errors);
      if (errors.length === 1) {
        // throw errors[0]
        console.error(errors[0].message);
      } else {
        for (const error of errors) {
          console.error(error.message);
        }
        // throw new Error('Got multiple validation errors: ' + Printer.inspect(errors))
      }
    } else {
      try {
        const result = await this.schemaLoader.doQuery(doc as any);

        if (result.data) {
          // console.dir(result.data)
          let transformed = this.getInnermostData(fieldPath, result.data);
          // _.cloneDeep(transformed)

          if (typeof transformed === 'object' && !util.isArray(transformed)) {
            const validKeys = Object.keys(transformed)
              .filter(key => !key.startsWith('['))
              .filter(key => key !== '__typename');

            const newObj: any = {};
            validKeys.forEach(key => newObj[key] = transformed[key]);
            transformed = newObj;
          }

          if (this.outputJson) {
            console.log(JSON.stringify(transformed));
          } else {
            console.log(util.inspect(transformed, {colors: true}));
          }
        }

        if (result.errors) {
          if (result.errors.length === 1) {
            console.error(result.errors[0].message)
          }
          Printer.debug('Errors:', result.errors);
        }
      } catch (e) {
        if (e.graphQLErrors) {
          Printer.debug(e);
          console.error(e.message);
        }
      }
    }


  }

  setArguments(sywacInner: any, args: any[]) {
    Printer.debug('Setting arguments', args.map(arg => arg.name));
    args.forEach(arg => {
      sywacInner.string(`--${arg.name}`, {
        desc: arg.description || '',
        group: 'Arguments:',
      })
      // flags: `--${arg.name}`,
      // required: false,
      // desc: arg.description || '',
      // // type: 'number',
      // hint: ''
    });
    // sywacInner.boolean('-u, --untracked', { desc: 'Include untracked changes' })
  }

  interpretField(sywac: any, selectionPath: string[], selectionArgs: any[], currentType: GraphQLObjectType, aField: GraphQLField<any, any>) {
    const fieldName = aField.name;
    const type: GraphQLOutputType = aField.type;
    const fieldType = aField.type as GraphQLNamedType;
    const fieldTypeNonNull = aField.type as GraphQLNonNull<any>;
    let fieldTypeNamed;
    if (fieldTypeNonNull && fieldTypeNonNull.ofType && fieldTypeNonNull.ofType.name) {
      fieldTypeNamed = fieldTypeNonNull.ofType;
    }

    let usage = `Usage: ${binName} ${selectionPath.join(' ')} <field> ...`;
    const commandPart ='';
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
          Printer.debug('fieldType', fieldType)
          Printer.debug('fieldTypeNonNull.ofType', fieldTypeNonNull.ofType)

          if (type instanceof GraphQLNonNull) {
            Printer.debug('GraphQLNonNull', type)
            if ((type.ofType as any).getFields) {
              this.genSubcommands(sywacInner, newSelectionPath, selectionArgs, type.ofType as any )
            } else {
              Printer.debug('no ofType', type)
            }
          } else if (type instanceof GraphQLScalarType) {
            Printer.debug('GraphQLScalarType', type)
          } else if (type instanceof GraphQLObjectType) {
            Printer.debug('GraphQLObjectType', type)
            this.genSubcommands(sywacInner, newSelectionPath, selectionArgs, type as any )
          } else if (type instanceof GraphQLList && (type.ofType as any).getFields) {
            Printer.debug('GraphQLList', type)
            this.genSubcommands(sywacInner, newSelectionPath, selectionArgs, type.ofType as any )
          } else {
            Printer.debug('UNKNOWN', type)
            sywacInner
              .usage(`Use this command to access this field (${Printer.inspect(fieldType)}): ${binName} ${newSelectionPath.join(' ')} ` )
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
          Printer.debug('Running command:', fixedSelectionPath);
          // Printer.debug(context);

          const args = this.resolveArgs(context, fixedSelectionPath);

          Printer.debug('Got args:', args);
          await this.runQuery(fixedSelectionPath, fieldType, args)
        }
      })
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
        }))
      }
    }
    return args;
  }

  genSubcommands(sywac: any, selectionPath: string[], selectionArgs: any[], type: GraphQLObjectType) {

    if (!type) {
      return;
    }

    const fields = type.getFields();
    for (const key in fields) {
      const aField = fields[key] as GraphQLField<any, any>;
      this.interpretField(sywac, selectionPath, selectionArgs, type, aField)
    }
  }


  async interpretCommands(argv: any) {

    this.configureOuput(argv);

    if (argv.argv.default) {
      const apiName = argv.argv.default;
      this.schema = await this.schemaLoader.load(argv.argv.default);

      const sywacother = require('sywac/api').get()
        .outputSettings({ maxWidth: 175 })
        .help('-h, --help')
        .usage(`Usage: ${binName} ${apiName} <field> ...`)

      this.genSubcommands(sywacother, [apiName], [], this.schema.getQueryType() as any);

      const parsed = await sywacother.parse();

      if (parsed.output.length > 0) {
        console.log(parsed.output);
      }


    } else {
      // console.log(JSON.stringify(argv, null, 2))
      // console.log('OUTPUT:')
      // console.log(argv.output)
    }

  }

  public async processGraphQLConfig() {

    const config = getGraphQLConfig(process.cwd());
    config.config = resolveEnvsInValues(config.config, process.env);

    let sywac = require('sywac/api').get()

    if (config.config.projects) {
      for (const key in config.config.projects) {
        sywac = sywac
          .positional(key, { paramsDesc: 'A required string argument' })
      }
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


    await this.interpretCommands(argv);

  }

  selectionWithSingleField(fieldName: string, args: any[], innerSelection?: SelectionSetNode): SelectionSetNode {
    const node: FieldNode = {
      kind: "Field",
      name: {
        kind: "Name",
        value: fieldName
      },
      arguments: args.map((arg: any) => ({
        kind: 'Argument',
        name: {
          kind: 'Name',
          value: arg.name,
        },
        value: {
          kind: 'IntValue',
          value: arg.value,
        }
      })),
      // directives?: DirectiveNode[];
      selectionSet: innerSelection,
    } as any;
    return {
      kind: 'SelectionSet',
      selections: [node]
    };
  }

  selectionSetForType(type: GraphQLNamedType): SelectionSetNode {

    const selectionSet: SelectionNode[] = [];
    // let selectionSet = "{";
    if (isObjectType(type)) {
      const outputType = type as GraphQLObjectType;
      Printer.debug("value: ", outputType);
      for (const fieldName in outputType.getFields()) {

        const node: FieldNode = {
          kind: "Field",
          name: {
            kind: "Name",
            value: fieldName
          },
          arguments: [],
          // directives?: DirectiveNode[];
          // selectionSet?: SelectionSetNode;
        };
        selectionSet.push(node);

        // const fieldValue: GraphQLField = outputType.getFields()[key];
       // selectionSet = selectionSet + key + ",";
      }
      return {
        kind: 'SelectionSet',
        selections: selectionSet
      };
      // selectionSet = selectionSet.substr(0, selectionSet.length - 1) + "}";
    } else {
      throw new Error(type.name + ' is not an object type')
    }

  }
}

export interface ProgramOptions {
  awsProfile?: string;
  awsRegion?: string;
  debug?: boolean;
}
export interface GenSchemaOptions {
}

import 'source-map-support/register'

import { DocumentNode, FieldNode, GraphQLNamedType, GraphQLSchema, GraphQLType, isObjectType, isOutputType, OperationDefinitionNode, printSchema, SelectionNode, SelectionSetNode, validate } from "graphql";
import {
  getGraphQLConfig,
  resolveEnvsInValues,
} from "graphql-config";
import Printer from "./printer";
import { GraphQLField, GraphQLNonNull, GraphQLObjectType, GraphQLOutputType } from "graphql/type/definition";
import * as util from "util";
import SchemaLoader from "./SchemaLoader";

const withErrors = (command: (...args: any[]) => Promise<void>) => {
  return async (...args: any[]) => {
    try {
      await command(...args);
    } catch (e) {

      if (e.stack) {
        console.error(e.stack);
      } else if (e.message) {
        console.error("Error: " + e.message);
      } else {
        console.error("Error: " + e);
      }

      process.exitCode = 1;
    }
  };
};


const binName = 'gcli';

const requireSingleValue = (params: string[]) => {
  return params[0];
  // if (typeof (params) === 'array') {
  //   return params[0];
  // } else if (typeof (params) === 'string') {
  //   return params;
  // } else {
  //   throw new Error('Invalid param type: ' + typeof (params))
  // }
};


export default class Actions {
  private global: ProgramOptions;
  private schemaLoader: SchemaLoader;
  private schema?: GraphQLSchema;
  private didRun = false;

  constructor(global: ProgramOptions, schemaLoader: SchemaLoader) {
    this.global = global;
    this.schemaLoader = schemaLoader;
  }

  buildSelectionSet(fieldPath: string[], leafType: GraphQLNamedType): SelectionSetNode | undefined {
    if (fieldPath.length === 0) {
      if (isObjectType(leafType)) {
        return this.selectionSetForType(leafType);
      } else {
        return undefined;
      }
    } else {
      return this.selectionWithSingleField(fieldPath[0], this.buildSelectionSet(fieldPath.slice(1), leafType));
    }
  }

  getInnermostData(fieldPath: string[], data: any): any {
    if (fieldPath.length === 0) {
      return data;
    } else {
      return this.getInnermostData(fieldPath.slice(1), data[fieldPath[0]]);
    }
  }

  async runQuery(fieldPath: string[], type: GraphQLNamedType) {

    const operation: OperationDefinitionNode = {
      kind: "OperationDefinition",
      operation: 'query',
      selectionSet: this.buildSelectionSet(fieldPath, type) as SelectionSetNode
    };


    const doc: DocumentNode = {
      kind: 'Document',
      definitions: [operation]
    };

    const errors = validate(this.schema as GraphQLSchema, doc);
    if (errors.length > 0) {
      throw errors;
    }


    const result = await this.schemaLoader.doQuery(doc as any);

    if (result.data) {
      // console.dir(result.data)
      const transformed = this.getInnermostData(fieldPath, result.data);
      console.log(transformed)
      // const transformed = JSON.parse(JSON.stringify(result.data[initialQuery]));
      // delete transformed["__typename"];
      // // delete result.data[initialQuery]['[Symbol(id)]'];
      // const printed = util.inspect(transformed, {
      //   showHidden: false,
      //   depth: null,
      //   colors: true
      // });
      // console.log(printed);

    }

    if (result.errors) {
      Printer.debug('Errors:', result.errors);
    }
  }



  interpretField(sywac: any, prevField: string, aField: GraphQLField<any, any>) {
    const fieldName = aField.name;
    const fieldType = aField.type as GraphQLNamedType;
    const fieldTypeNonNull = aField.type as GraphQLNonNull<any>;
    // console.log('field: ' + key + ", "  + fields[key].description)
    // console.dir(fields[key])
    sywac
      .usage(`Usage: ${binName} ${prevField} <field> ...`)
      .command(fieldName, {
        // ignore: [key],
        desc: aField.description,
        setup: (sywacInner: any) => {
          Printer.debug('Setting up subcommand', fieldName);
          if (fieldTypeNonNull.ofType && fieldTypeNonNull.ofType.getFields) {
            this.genSubcommands(sywacInner, prevField + ' ' + fieldName, fieldTypeNonNull.ofType )
          } else {
            sywacInner
              .usage(`Use this command to access this field (${Printer.inspect(fieldType)}): ${binName} ${prevField + ' ' + fieldName} ` )
          }

        },
        run: async (arg1: any, context: any) => {
          Printer.debug('Running ' + fieldName);
          await this.runQuery(context.details.args, fieldType)
        }
      })
  }

  genSubcommands(sywac: any, field: string, type: GraphQLObjectType) {

    if (!type) {
      return;
    }
    const fields = type.getFields();
    for (const key in fields) {
      const aField = fields[key] as GraphQLField<any, any>;
      this.interpretField(sywac, field, aField)
    }
  }

  async interpretCommands(argv: any) {

    if (argv.argv.default) {
      const apiName = argv.argv.default;
      this.schema = await this.schemaLoader.load(argv.argv.default);

      const sywacother = require('sywac/api').get()
        .outputSettings({ maxWidth: 175 })
        .help('-h, --help')
        .usage(`Usage: ${binName} ${apiName} <field> ...`)

      this.genSubcommands(sywacother, apiName, this.schema.getQueryType() as any);

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

    const newArgs = argv.details.args.filter((arg: string) => arg !== '--debug');

    process.argv = process.argv.slice(0, 2).concat(newArgs.slice(1));


    await this.interpretCommands(argv);

  }

  selectionWithSingleField(fieldName: string, innerSelection?: SelectionSetNode): SelectionSetNode {
    const node: FieldNode = {
      kind: "Field",
      name: {
        kind: "Name",
        value: fieldName
      },
      arguments: [],
      // directives?: DirectiveNode[];
      selectionSet: innerSelection,
    };
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
      console.log("value: " + Printer.inspect(outputType));
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

  public genSchema = (name: string) => async (initialQuery: string, otherDirs: any, options: GenSchemaOptions) => {
    this.didRun = true;
    if (this.global.debug) {
      console.log("query: " + initialQuery);
      console.log("otherDirs: " + Printer.json(otherDirs));
      // console.log('profile: ' + this.global.awsProfile);
      // console.log('region: ' + this.global.awsRegion);
    }

    let query = initialQuery;

    const schema = await this.schemaLoader.load(name);


    console.log(printSchema(schema));

    const queryType = schema.getQueryType();
    if (queryType) {

      for (const key in queryType.getFields()) {
        const value: GraphQLField<any, any> = queryType.getFields()[key];
        console.log("key: " + key);


        let selectionSet = "{";
        if (isObjectType(value.type)) {
          const outputType = value.type as GraphQLObjectType;
          console.log("value: " + Printer.inspect(outputType));
          for (const fieldName in outputType.getFields()) {
            selectionSet = selectionSet + fieldName + ",";
          }

          selectionSet = selectionSet.substr(0, selectionSet.length - 1) + "}";
        }


        if (key === query) {
          if (value.args && value.args.length === 1) {
            const p = requireSingleValue(otherDirs);

            query = query + "(" + value.args[0].name + ":" + JSON.stringify(p) + ") " + selectionSet;
          }
        }
      }
    } else {
      throw new Error('No query type in schema.')
    }


    const result = await this.schemaLoader.doQuery(query);

    if (result.data) {
      const transformed = JSON.parse(JSON.stringify(result.data[initialQuery]));
      delete transformed["__typename"];
      // delete result.data[initialQuery]['[Symbol(id)]'];
      const printed = util.inspect(transformed, {
        showHidden: false,
        depth: null,
        colors: true
      });
      console.log(printed);

    }

    if (result.errors) {
      console.error("Errors: " + Printer.inspect(result.errors, true));
    }
  };

}

export interface ProgramOptions {
  awsProfile?: string;
  awsRegion?: string;
  debug?: boolean;
}
export interface GenSchemaOptions {
}


import 'source-map-support/register'

import * as path from "path";
import * as fs from "fs";
import { introspectSchema, makeRemoteExecutableSchema } from "graphql-tools/dist/stitching";
import { DocumentNode, FieldNode, GraphQLNamedType, GraphQLSchema, GraphQLType, isObjectType, isOutputType, OperationDefinitionNode, printSchema, SelectionNode, SelectionSetNode, validate } from "graphql";
import {
  getGraphQLProjectConfig,
  getGraphQLConfig,
  ConfigNotFoundError,
  resolveEnvsInValues,
  writeSchema,
  GraphQLConfig,
  GraphQLProjectConfig,
  GraphQLEndpoint
} from "graphql-config";
import Printer from "./printer";
import { createHttpLink } from "apollo-link-http";
import { InMemoryCache } from "apollo-boost";
import ApolloClient from "apollo-client";
import gql from "graphql-tag";
import { GraphQLEndpointsExtension } from "graphql-config/lib/extensions";
import { GraphQLField, GraphQLNonNull, GraphQLObjectType, GraphQLOutputType } from "graphql/type/definition";
import * as util from "util";
import SchemaLoader from "./SchemaLoader";
// import {Api} from 'sywac';
// declare module 'sywac'


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
    // if (value.args && value.args.length === 1) {
    //   const p = requireSingleValue(otherDirs);

    const operation: OperationDefinitionNode = {
      kind: "OperationDefinition",
      operation: 'query',
      // readonly variableDefinitions?: ReadonlyArray<VariableDefinitionNode>;
      // readonly directives?: ReadonlyArray<DirectiveNode>;
      selectionSet: this.buildSelectionSet(fieldPath, type) as SelectionSetNode
    };

    // console.log('SELE')
    // Printer.log(operation.selectionSet);

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

    // path.map(part => part)
     // query = query + "(" + value.args[0].name + ":" + JSON.stringify(p) + ") " + selectionSet;
    // }
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
            // console.log('type under ' + key)
            // console.dir(fields[key].type.ofType)
            this.genSubcommands(sywacInner, prevField + ' ' + fieldName, fieldTypeNonNull.ofType )
          } else {

            sywacInner
              .usage(`Use this command to access this field (${Printer.inspect(fieldType)}): ${binName} ${prevField + ' ' + fieldName} ` )

            // console.log('no fields in ' )
            // console.dir(fields[key].type.ofType)
          }

        },
        run: async (arg1: any, context: any) => {
          Printer.debug('Running ' + fieldName);
          await this.runQuery(context.details.args, fieldType)
          // console.dir(arg1.args)
          // console.dir(context.details.args)
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

  async interpretCommands(argv: any) { // sywac: any, name: string) { //

    // console.log('loading: ' + name);
    // const schema = await this.schemaLoader.load(name);
    //
    //   // .help('-h, --help');
    //
    // const fields = (schema.getQueryType() as any).getFields();
    // for (const key in fields) {
    //
    //   sywac
    //     .command(key, {
    //       desc: fields[key].description,
    //       // paramsDesc: ['The name of the remote', 'The url of the remote'],
    //       run: (argv, context) => {
    //         // if (remoteExists(argv.name)) {
    //         //   return context.cliMessage(`Remote ${argv.name} already exists`)
    //         // }
    //         console.log(`adding remote ${argv.name} with url ${argv.url}`)
    //       }
    //     })
    //
    // }

    // const parsed = await sywac.parse();
    //
    //
    // console.log(parsed.output)



    if (argv.argv.default) {
      const apiName = argv.argv.default;
      // console.log('loading: ' + argv.argv.default);
      this.schema = await this.schemaLoader.load(argv.argv.default);

      const sywacother = require('sywac/api').get()
        .outputSettings({ maxWidth: 175 })
        .help('-h, --help')
        .usage(`Usage: ${binName} ${apiName} <field> ...`)

      this.genSubcommands(sywacother, apiName, this.schema.getQueryType() as any);
      //
      // const fields = (schema.getQueryType() as any).getFields();
      // for (const key in fields) {
      //   // console.log('field: ' + key + ", "  + fields[key].description)
      //   // console.dir(fields[key])
      //   sywacother
      //    .command(key, {
      //      // ignore: [key],
      //      desc: fields[key].description
      //    })
      //
      // }

      const parsed = await sywacother.parse();

      if (parsed.output.length > 0) {
        console.log(parsed.output);
      }

      // Printer.debug(parsed)
      // console.log(JSON.stringify(parsed.details.args, null, 2))
      // console.log('OUTPUT:')
      // console.log(parsed.output)


    } else {
      // console.log(JSON.stringify(argv, null, 2))
      // console.log('OUTPUT:')
      // console.log(argv.output)
    }
    //
    //




    //
    // let sywac = require('sywac');
    //
    // if (config.config.projects) {
    //   for (const key in config.config.projects) {
    //     sywac = sywac
    //       .positional(key, { paramsDesc: 'A required string argument' })
    //   }
    // }
    // const argv = await sywac
    // // .positional('<apiName>', { paramsDesc: 'A required string argument' })
    // // .boolean('-b, --bool', { desc: 'A boolean option' })
    // // .number('-n, --num <number>', { desc: 'A number option' })
    //   .help('-h, --help')
    //   .version('-v, --version')
    //   .showHelpByDefault()
    //   .outputSettings({ maxWidth: 75 })
    //   .parse()
    //

  }

  // async generateApi(yargs: any, apiName: string) {
  //
  //
  //   const schema = await this.schemaLoader.load(apiName);
  //
  //   yargs.command('sometihng', 'asdaa')
  //   return yargs;
  // }

  public async processGraphQLConfig() {

    const config = getGraphQLConfig(process.cwd());
    config.config = resolveEnvsInValues(config.config, process.env);


    // console.log(util.inspect(sywacAll));
    // console.log(util.inspect(sywacAll.Api));

    let sywac = require('sywac/api').get()
    // let sywac = require('sywac')

    if (config.config.projects) {
      for (const key in config.config.projects) {

        // sywac.command(`${key}`, async sss => {
        //     console.log('RUNNING '  +key)
        //     // await this.interpretCommands(sywac, key)
        //
        //   })


        // sywac.command(`${key}`, {
        //   desc: 'Access ' + key + ' API',
        //   // ignore: ['<subcommand>', '[args]'],
        //   setup: (sywac) => {
        //     // sywac.help('-h, --help')
        //     //   .showHelpByDefault()
        //   },
        //   run: async sywac => {
        //     console.log('RUNNING '  +key)
        //     // await this.interpretCommands(sywac, key)
        //
        //   }
        // })


        sywac = sywac
          .positional(key, { paramsDesc: 'A required string argument' })
      }
    }
    const argv = await sywac
      .boolean('-d, --debug', { desc: 'Enable debug logging' })
      // .help('-h, --help')
      // .version('-v, --version')
      // .showHelpByDefault()
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

    // process.argv.splice(2,1);
    // process.argv[1] = process.argv[2];
    // process.argv[2] = process.argv[3];
    // process.argv[3] = process.argv[4];
    // process.argv[4] = process.argv[5];
    //
    //
    // process.argv.shift()

    // console.dir(newArgs)
    // console.dir(process.argv)

    await this.interpretCommands(argv);








      // .then(argv => {
      //
      //
      //   interpretCommands(argv);
      //
      //   console.log(JSON.stringify(argv, null, 2))
      //   console.log('OUTPUT:')
      //   console.log(argv.output)
      //
      // });



    //
    // let gyargs = require('yargs');
    // const YargsPromise = require('yargs-promise');
    //
    // let parser = new YargsPromise(gyargs);
    //
    //
    // parser = parser
    //   .usage('usage: $0 <command>');
    //
    //
    //
    // if (config.config.projects) {
    //   for (const key in config.config.projects) {
    //
    //   //  const schema = await this.genSchema(key);
    //
    //     parser = parser.command(key, `Access ${key} API`, ()=>{}, (yargs) => {
    //
    //
    //       this.generateApi(yargs, key).then(yargs.resolve).catch(yargs.reject)
    //
    //       // return new Promise((resolve, reject) => {
    //       //
    //       //
    //       // })
    //
    //       // yargs = await this.generateApi(yargs, key);
    //
    //
    //       yargs = yargs
    //         .usage(`usage: $0 ${key} <item> [options]`)
    //         // .command('project', 'create a new project', function (yargs) {
    //         //   console.log('creating project :)')
    //         // })
    //         // .command('module', 'create a new module', function (yargs) {
    //         //   console.log('creating module :)')
    //         // })
    //         .help('help')
    //         .updateStrings({
    //           'Commands:': 'item:'
    //         })
    //         .wrap(null)
    //         .argv;
    //
    //
    //     })
    //   }
    // }
    //
    // let argv = parser
    //   .help('help')
    //   .wrap(null)
    //   .argv;












    // let argv = yargs
    //   .command('create', 'create a new [project|module]', function (yargs) {
    //
    //     console.log('inside: create'  )
    //     console.dir(yargs.argv);
    //    // generateApi()
    //     argv = yargs
    //       .usage('usage: $0 create <item> [options]')
    //       .command('project', 'create a new project', function (yargs) {
    //         console.log('creating project :)')
    //       })
    //       .command('module', 'create a new module', function (yargs) {
    //         console.log('creating module :)')
    //       })
    //       .help('help')
    //       .updateStrings({
    //         'Commands:': 'item:'
    //       })
    //       .wrap(null)
    //       .argv;
    //     checkCommands(yargs, argv, 2)
    //   })
    //   .command('list', 'list items in project', function (yargs) {
    //     console.log('listing items in project :)')
    //   })
    //   .help('help')
    //   .wrap(null)
    //   .argv;

    // checkCommands(yargs, argv, 1)
    //
    // function checkCommands (yargs, argv, numRequired) {
    //   if (argv._.length < numRequired) {
    //     yargs.showHelp()
    //   } else {
    //     // check for unknown command
    //   }
    // }





    // let argvBuilder = require('yargs')
    //   .exitProcess(false)
    //   .help('info')
    //   .fail( (msg, err, yargs) => {
    //     console.error('You broke it!')
    //     if (err) throw err // preserve stack
    //     console.error('You broke it!')
    //     console.error(msg)
    //     console.error('You should be doing', yargs.help())
    //     process.exit(1)
    //   })
    //   .usage('Usage: $0 <api-name> [further options...]');
    //
    //
    // const config = getGraphQLConfig(process.cwd());
    // config.config = resolveEnvsInValues(config.config, process.env);
    //
    // if (config.config.projects) {
    //   for (const key in config.config.projects) {
    //
    //   //  const schema = await this.genSchema(key);
    //
    //     argvBuilder = argvBuilder.command(key, `Access ${key} API`)
    //   }
    // }
    //
    //
    // console.log('2parsing...')
    // const argv = argvBuilder.argv;
    //
    // const command = argv._[0];
    //
    //
    // console.log('parsed..------------------- ' + command);
    //
    // console.dir(argv);
    //
    //
    // if (argv.help && command) {
    //
    //   argvBuilder.command(command, 'sometihng', 'asdaa')
    //
    //
    //   argvBuilder.showHelp()
    // } else if (argv.help) {
    //   argvBuilder.showHelp()
    // }


    // if (argv.help) {
    //   argv.describe(command)
    // }



    //
    // if (argv.ships > 3 && argv.distance < 53.5) {
    //   console.log('Plunder more riffiwobbles!')
    // } else {
    //   console.log('Retreat from the xupptumblers!')
    // }



    // console.log('V: ' + Printer.json( config.config.projects));

    // let run = false;
    // if (config.config.projects) {
    //   for (const key in config.config.projects) {
    //
    //     const schema = await this.schemaLoader.load(key);
    //   //  const schema = await this.genSchema(key);
    //
    //     const value = config.config.projects[key];
    //     const program = this.global as any;
    //     run = true;
    //     program
    //       .command(`${key} [query] [otherDirs...]`)
    //       .description("Generate graphql schema from aws lambda function")
    //       .option("-o, --output [path]", "Where to put generated schema file")
    //       .option("-t, --proxy-target-url [url]", "Target url if using proxy lambda function")
    //       .action(withErrors(this.genSchema(key)));
    //
    //     const fields = (schema.getQueryType() as any).getFields();
    //     for (const key in fields) {
    //       console.log('key: ' + key)
    //       const value = config.config.projects[key];
    //       const program = this.global as any;
    //       run = true;
    //       program
    //         .command(`${key} [query] [otherDirs...]`)
    //         .description("Generate graphql schema from aws lambda function")
    //         .option("-o, --output [path]", "Where to put generated schema file")
    //         .option("-t, --proxy-target-url [url]", "Target url if using proxy lambda function")
    //         .action(withErrors(this.genSchema(key)));
    //     }
    //
    //
    //
    //   }
    // }

    // if (!this.didRun) {
    //   console.error('Did not find project with given name')
    // }
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

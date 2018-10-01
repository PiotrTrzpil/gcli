//reflect-metadata should be imported
//before any interface or other imports
//also it should be imported only once
//so that a singleton is created.
import "reflect-metadata";
import 'source-map-support/register';
import { suite, test, slow, timeout } from "mocha-typescript";
import * as chai from 'chai'
import 'chai/register-should';
import 'chai/register-expect';
import gql from "graphql-tag";
import * as fs from "fs";
import { addMockFunctionsToSchema, makeExecutableSchema } from 'graphql-tools';
import Printer from './Printer';
import SchemaLoader from './SchemaLoader';
import { DocumentNode, ExecutionResult, graphql, GraphQLSchema, print } from 'graphql';
import Actions from './Actions';
import { getGraphQLConfig, resolveEnvsInValues } from 'graphql-config';
import { ProjectLoader } from './ProjectLoader';
import { ApolloQueryResult } from 'apollo-client';
import ApolloClient from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';

const expect = chai.expect;

chai.config.includeStack = false;
chai.config.truncateThreshold = 0;

process.env.DEBUG_ENABLED = 'true';
process.env.DEBUG_COLORS = 'true';


@suite class MainSpec {

  static before() {
    const schemaString = fs.readFileSync('./src/test-schema.graphql').toString();
    const schema = makeExecutableSchema({ typeDefs: schemaString as any });

    addMockFunctionsToSchema({ schema });

    return Promise.resolve(schema);

  }

//   @test async 'show help'() {
//     process.argv = ['', '--debug', '--default', 'proj1', '--help'];
//
//     const options = {
//     };
//
//     const actions = new Actions(options, new TestProjectLoader(), new TestSchemaLoader());
//     const output = await actions.processGraphQLConfig();
//
//     this.logOutput(output);
//     expect(output.trim()).to.eq(`
// Usage: gcli proj1 <field> ...
//
// Options:
//   -h, --help  Show help                                                                                                                              [commands: help] [boolean]
//
//     `.trim())
//   }

  @test async 'show field usage'() {
    process.argv = ['', '--debug', 'proj1', 'nested', 'field'];

    const options = {
    };

    const actions = new Actions(options, new TestProjectLoader(), new TestSchemaLoader());
    const output = await actions.processGraphQLConfig();

    this.logOutput(output);
    expect(output.trim()).to.eq(`'Hello World'`.trim())
  }


  logOutput(output: string) {
    console.log('\n\n----------------------------------------------------');
    console.log(output)
    console.log('----------------------------------------------------\n\n');
  }
}



class TestProjectLoader extends ProjectLoader {

  * getProjectNames(): IterableIterator<string> {
    yield 'proj1'
  }
}

class TestSchemaLoader extends SchemaLoader {
  private schema!: GraphQLSchema;
  constructor() {
    super(({link: null , global: null} as any));
  }

  public async load(name: string): Promise<GraphQLSchema> {
    const schemaString = fs.readFileSync('./src/test-schema.graphql').toString();

    const schema = makeExecutableSchema({ typeDefs: schemaString as any });
    this.schema = schema;
    addMockFunctionsToSchema({ schema });

    return Promise.resolve(schema);
    //     const query = `
    // query tasksForUser {
    //   user(id: 6) { id, name }
    // }
    // `;
    //
    // graphql(schema, query).then((result) => console.log('Got result', result));


  }


  async doQuery(query: DocumentNode): Promise<ExecutionResult> {

    return graphql(this.schema, print(query)); // .then((result) => console.log('Got result', result));


    //
    // this.schema.getDirectives().j
    // const defaultOptions = {
    //   watchQuery: {
    //     fetchPolicy: 'network-only',
    //   },
    //   query: {
    //     fetchPolicy: 'network-only',
    //   },
    //   mutate: {
    //     fetchPolicy: 'network-only',
    //   },
    // };
    //
    // const client = new ApolloClient({
    //   link: this.link,
    //   cache: new InMemoryCache(),
    //   defaultOptions: defaultOptions,
    // } as any);
    //
    // Printer.debug('Sending query: ', query);
    //
    // return client.query({
    //   query: query as any, // gql`query { ${query} }`
    // });
  }

}

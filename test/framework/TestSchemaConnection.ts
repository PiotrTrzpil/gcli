import 'reflect-metadata';
import 'source-map-support/register';
import SchemaConnection from '../../src/SchemaConnection';
import { DocumentNode, ExecutionResult, graphql, GraphQLSchema, print } from 'graphql';
import * as fs from 'fs';
import { addMockFunctionsToSchema, makeExecutableSchema } from 'graphql-tools';

export class TestSchemaConnection extends SchemaConnection {
  private schema!: GraphQLSchema;
  private schemaFiles: Map<string, string>;

  constructor(schemas: string[]) {
    super(({ link: null, global: null } as any));
    this.schemaFiles = new Map(schemas.map(name => [name, `./test/schemas/${name}.graphql`] as [string, string]));
  }

  public async load(name: string): Promise<GraphQLSchema> {
    const maybeSchemaFile = this.schemaFiles.get(name);
    if (!maybeSchemaFile) {
      throw new Error(`Schema ${name} does not exist`)
    }
    const schemaString = fs.readFileSync(maybeSchemaFile.toString()).toString('utf-8');
    const schema = makeExecutableSchema({
      typeDefs: schemaString as any,
      resolverValidationOptions: {
        requireResolversForResolveType: false
      }
    });
    this.schema = schema;
    addMockFunctionsToSchema({
      schema,
      mocks: {
        User: () => ({
          databaseId: 42,
          name: 'some-github-user'
        }),
      }
    });
    return Promise.resolve(schema);
  }

  async doQuery(query: DocumentNode): Promise<ExecutionResult> {
    return graphql(this.schema, print(query));
  }
}
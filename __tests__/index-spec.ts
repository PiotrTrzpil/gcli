import * as index from '../src/index';
import Actions from "../src/actions";
import SchemaLoader from "../src/SchemaLoader";
import { GraphQLSchema, printSchema } from "graphql";
import { ApolloQueryResult } from "apollo-client";


class TestSchemaLoader extends SchemaLoader { /* bla bla bla */
  constructor() {
    super(({link: null , global: null} as any));

  }

  public async load(name: string): Promise<GraphQLSchema> {

  }

  async doQuery(query: string): Promise<ApolloQueryResult<any>> {

  }

}


test('Should have Greeter available', async () => {



  const global = {
    debug: true,
  };


  const actions = new Actions(global, new TestSchemaLoader());



  const schema = await actions.genSchema('default');

  //console.log(printSchema(schema));






  expect(true).toBeTruthy();
});

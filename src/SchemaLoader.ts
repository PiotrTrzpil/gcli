import { createHttpLink } from "apollo-link-http";
import { getGraphQLConfig, resolveEnvsInValues } from "graphql-config";
import { GraphQLEndpointsExtension } from "graphql-config/lib/extensions";
import { introspectSchema } from "graphql-tools/dist/stitching";
import { GraphQLSchema, printSchema } from "graphql";
import gql from "graphql-tag";
import ApolloClient, { ApolloQueryResult } from "apollo-client";
import { ApolloLink, InMemoryCache } from "apollo-boost";
import { ProgramOptions } from "./actions";
import Printer from "./printer";
import makeRemoteExecutableSchema from "graphql-tools/dist/stitching/makeRemoteExecutableSchema";
import * as fs from "fs";

export default class SchemaLoader {
  private link?: ApolloLink;
  private global: ProgramOptions;

  constructor(props: {link?: ApolloLink, global: ProgramOptions}) {
    this.link = props.link;
    this.global = props.global;
  }

  public async load(name: string): Promise<GraphQLSchema> {
    const config = getGraphQLConfig(process.cwd());
    config.config = resolveEnvsInValues(config.config, process.env);


    if (!config.getProjectConfig(name) || !config.getProjectConfig(name).endpointsExtension) {
      throw new Error("Cannot find project: " + name);
    }
    const endpoints = config.getProjectConfig(name).endpointsExtension as GraphQLEndpointsExtension;

    const endpoint = endpoints.getEndpoint("default");
    Printer.debug('Introspecting: ' + endpoint.url)
    // console.log('With headers: ' + Printer.inspect(endpoint.headers));

    const link = createHttpLink({ uri: endpoint.url, headers: endpoint.headers });
    this.link = link;
    // const schema = makeRemoteExecutableSchema({
    //   schema: await introspectSchema(link),
    //   link: link,
    // });

    let predefinedSchema;
    if (fs.existsSync(name + '.schema')) {
      // Do something
      predefinedSchema = fs.readFileSync(name + '.schema').toString('utf-8');
    } else {
      predefinedSchema = await introspectSchema(this.link as any)
      fs.writeFileSync(name + '.schema', printSchema(predefinedSchema))
    }

    return makeRemoteExecutableSchema({
      schema: predefinedSchema,
      link: this.link,
    } as any);

   // return introspectSchema(link as any);
  }

  async doQuery(query: string): Promise<ApolloQueryResult<any>> {
    // const onefield = (schema.getQueryType().getFields() as any).filter( (k, v) => k === query);
    // console.log("SHCMEA: " + Printer.inspect(onefield, true))
    // disable cache:
    const defaultOptions = {
      watchQuery: {
        fetchPolicy: "network-only"
      },
      query: {
        fetchPolicy: "network-only"
      },
      mutate: {
        fetchPolicy: "network-only"
      }
    };

    const client = new ApolloClient({
      link: this.link,
      cache: new InMemoryCache(),
      defaultOptions: defaultOptions
    } as any);

    Printer.debug("Sending query: ", query);

    return client.query({
      query: query as any // gql`query { ${query} }`
    });
  }
}
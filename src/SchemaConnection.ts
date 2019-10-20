import 'reflect-metadata';
import 'source-map-support/register';
import { createHttpLink } from 'apollo-link-http';
import { getGraphQLConfig, resolveEnvsInValues } from 'graphql-config';
import { GraphQLEndpointsExtension } from 'graphql-config/lib/extensions';
import { introspectSchema } from 'graphql-tools/dist/stitching';
import { DocumentNode, ExecutionResult, GraphQLSchema, printSchema } from 'graphql';
import ApolloClient, { ApolloQueryResult } from 'apollo-client';
import { ApolloLink, InMemoryCache } from 'apollo-boost';
import { ProgramOptions } from './Actions';
import Printer from './utils/Printer';
import makeRemoteExecutableSchema from 'graphql-tools/dist/stitching/makeRemoteExecutableSchema';
import * as fs from 'fs';

export default class SchemaConnection {
  private link?: ApolloLink;
  private global: ProgramOptions;

  constructor(props: { link?: ApolloLink, global: ProgramOptions }) {
    this.link = props.link;
    this.global = props.global;
  }

  public async load(name: string): Promise<GraphQLSchema> {
    Printer.debug('project name: ' + name)
    const config = getGraphQLConfig(process.cwd());
    config.config = resolveEnvsInValues(config.config, process.env);

    if (!config.getProjectConfig(name) || !config.getProjectConfig(name).endpointsExtension) {
      throw new Error('Cannot find project: ' + name);
    }
    const endpoints = config.getProjectConfig(name).endpointsExtension as GraphQLEndpointsExtension;

    const endpoint = endpoints.getEndpoint('default');
    Printer.debug('Introspecting: ' + endpoint.url);

    this.link = createHttpLink({ uri: endpoint.url, headers: endpoint.headers });

    let predefinedSchema;
    if (fs.existsSync(name + '.schema')) {
      predefinedSchema = fs.readFileSync(name + '.schema').toString('utf-8');
    } else {
      predefinedSchema = await introspectSchema(this.link as any);
      fs.writeFileSync(name + '.schema', printSchema(predefinedSchema));
    }

    return makeRemoteExecutableSchema({
      schema: predefinedSchema,
      link: this.link,
    } as any);
  }

  async doQuery(query: DocumentNode): Promise<ExecutionResult> {
    const defaultOptions = {
      watchQuery: {
        fetchPolicy: 'network-only',
      },
      query: {
        fetchPolicy: 'network-only',
      },
      mutate: {
        fetchPolicy: 'network-only',
      },
    };

    const client = new ApolloClient({
      link: this.link,
      cache: new InMemoryCache(),
      defaultOptions: defaultOptions,
    } as any);

    Printer.debug('Sending query: ', query);

    return client.query({
      query: query,
    });
  }
}
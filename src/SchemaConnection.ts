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
import * as path from 'path';

export default class SchemaConnection {
  private link?: ApolloLink;
  private global: ProgramOptions;

  constructor(props: { link?: ApolloLink, global: ProgramOptions }) {
    this.link = props.link;
    this.global = props.global;
  }

  /**
   * Sanitize project name to prevent path traversal attacks.
   * Only allows alphanumeric characters, hyphens, and underscores.
   */
  private sanitizeProjectName(name: string): string {
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      throw new Error(`Invalid project name: "${name}". Only alphanumeric characters, hyphens, and underscores are allowed.`);
    }
    return name;
  }

  /**
   * Get the safe schema cache file path for a project.
   */
  private getSchemaCachePath(name: string): string {
    const sanitizedName = this.sanitizeProjectName(name);
    const cacheDir = process.cwd();
    const schemaPath = path.join(cacheDir, `${sanitizedName}.schema`);

    // Ensure the resolved path is within the current working directory
    const resolvedPath = path.resolve(schemaPath);
    const resolvedCacheDir = path.resolve(cacheDir);
    if (!resolvedPath.startsWith(resolvedCacheDir + path.sep)) {
      throw new Error('Invalid schema path: path traversal detected');
    }

    return schemaPath;
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

    const schemaPath = this.getSchemaCachePath(name);
    let predefinedSchema;
    if (fs.existsSync(schemaPath)) {
      predefinedSchema = fs.readFileSync(schemaPath).toString('utf-8');
    } else {
      predefinedSchema = await introspectSchema(this.link as any);
      fs.writeFileSync(schemaPath, printSchema(predefinedSchema));
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
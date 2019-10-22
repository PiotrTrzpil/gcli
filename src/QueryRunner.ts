import 'reflect-metadata';
import 'source-map-support/register';
import * as util from 'util';
import Printer from './utils/Printer';
import {
  DocumentNode, GraphQLError,
  GraphQLNamedType,
  GraphQLSchema,
  OperationDefinitionNode,
  SelectionSetNode,
  print,
  validate, printSchema, GraphQLOutputType,
} from 'graphql';
import { Arg, SelectionSets } from './SelectionSets';
import SchemaConnection from './SchemaConnection';
import { ApolloQueryResult } from 'apollo-client';
import { Diagnostics } from './Diagnostics';

export class QueryResult {
  constructor(
    private outputObj: any,
    private validationErrors?: ReadonlyArray<GraphQLError>,
    public raw?: ApolloQueryResult<any>,
  ) {

  }

  public static fromErrors(errors: ReadonlyArray<GraphQLError>) {
    return new QueryResult(
      errors.map(err => err.message),
      errors
    );
  }

  toOutput() {
    if (this.validationErrors) {
      return this.validationErrors.map(err => {
        if (err.stack) {
          throw err;
        } else {
          return err.message;
        }
      }).join('\n')
    } else {
      return util.inspect(this.outputObj)
    }
  }
}

export class QueryRunner {
  private selectionSets: SelectionSets;
  private schema!: GraphQLSchema;

  constructor(
    private diagnostics: Diagnostics,
    private schemaConnection: SchemaConnection) {

    this.selectionSets = new SelectionSets(diagnostics);
  }

  async loadSchema(name: string): Promise<GraphQLSchema> {
    try {
      this.schema = await this.schemaConnection.load(name);
      Printer.debug('Loaded schema:\n', printSchema(this.schema));
      if (!this.schema.getQueryType()) {
        throw new Error('No query type in the schema!')
      }
      return this.schema;
    } catch (e) {
      throw new Error(`Failed to load schema ${name}: ` + e)
    }
  }

  getInnermostData(fieldPath: string[], data: any): any {
    if (fieldPath.length === 0) {
      return data;
    } else {

      if (util.isArray(data)) {
        return data.map(elem => {
          return this.getInnermostData(fieldPath, elem);
        });
      } else {
        const newData = data[fieldPath[0]];
        if (!newData) {
          throw new Error('Cannot find ' + fieldPath[0] + ' in: ' + Printer.insp(data));
        }
        return this.getInnermostData(fieldPath.slice(1), newData);
      }
    }
  }

  transformData(fieldPath: string[], data: any) {
    let transformed = this.getInnermostData(fieldPath, data);

    if (typeof transformed === 'object' && !util.isArray(transformed)) {
      const validKeys = Object.keys(transformed)
        .filter(key => !key.startsWith('['))
        .filter(key => key !== '__typename');

      const newObj: any = {};
      validKeys.forEach(key => newObj[key] = transformed[key]);
      transformed = newObj;
    }
    return transformed;
  }

  async runQuery(outputJson: boolean, fieldPath: string[], type: GraphQLOutputType, args: Record<string, Arg[]>): Promise<QueryResult> {

    const selectionSet = this.selectionSets.buildSelectionSet(fieldPath, type, args);
    if (!selectionSet) {
      Printer.debug('No selection set..');
    }

    const operation: OperationDefinitionNode = {
      kind: 'OperationDefinition',
      operation: 'query',
      selectionSet: selectionSet as SelectionSetNode,
    };

    const doc: DocumentNode = {
      kind: 'Document',
      definitions: [operation],
    };

    this.diagnostics.logQuery(doc);

    const errors = validate(this.schema as GraphQLSchema, doc);
    if (errors.length > 0) {
      Printer.debug('Got validation errors', errors.slice(0, 4));
      return QueryResult.fromErrors(errors);
    } else {
      try {
        const result = await this.schemaConnection.doQuery(doc as any);
        if (result.data) {
          return new QueryResult(
            this.transformData(fieldPath, result.data)
          );
        }

        if (result.errors) {
          return QueryResult.fromErrors(errors);
        } else {
          throw new Error('no data nor errors')
        }
      } catch (e) {
        if (e.graphQLErrors) {
          // Printer.debug(e);
          // console.error(e.message);
          return new QueryResult(
            [e.message],
            [e]
          );
        } else {
          throw e;
        }
      }
    }


  }


}
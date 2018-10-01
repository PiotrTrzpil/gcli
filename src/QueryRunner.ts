import * as util from 'util';
import Printer from './Printer';
import {
  DocumentNode, GraphQLError,
  GraphQLNamedType,
  GraphQLSchema,
  OperationDefinitionNode,
  SelectionSetNode,
  validate,
} from 'graphql';
import { SelectionSets } from './SelectionSets';
import SchemaLoader from './SchemaLoader';
import { ApolloQueryResult } from 'apollo-client';

export interface QueryResult {
  validationErrors?: ReadonlyArray<GraphQLError>
  raw?: ApolloQueryResult<any>
  outputObj: any
  // output: string
}

export class QueryRunner {
  private selectionSets: SelectionSets;
  private schemaLoader: SchemaLoader;
  private schema!: GraphQLSchema;

  constructor(schemaLoader: SchemaLoader) {
    this.selectionSets = new SelectionSets();
    this.schemaLoader = schemaLoader;
  }

  async loadSchema(name: string): Promise<GraphQLSchema> {
    this.schema = await this.schemaLoader.load(name);
    return this.schema;
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

  async runQuery(outputJson: boolean, fieldPath: string[], type: GraphQLNamedType, args: any): Promise<QueryResult> {

    const operation: OperationDefinitionNode = {
      kind: 'OperationDefinition',
      operation: 'query',
      selectionSet: this.selectionSets.buildSelectionSet(fieldPath, type, args) as SelectionSetNode,
    };

    const doc: DocumentNode = {
      kind: 'Document',
      definitions: [operation],
    };

    // Printer.debug('validating document:', doc)
    const errors = validate(this.schema as GraphQLSchema, doc);
    if (errors.length > 0) {
      Printer.debug('Got validation erorrs', errors);
      return {
        validationErrors: errors,
        outputObj: errors.map(err => err.message),
      };
    } else {
      try {
        const result = await this.schemaLoader.doQuery(doc as any);
        Printer.debug('RAW RES:', result)
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
          return {
            outputObj: transformed,
          };
        }

        if (result.errors) {
          return {
            validationErrors: result.errors,
            outputObj: result.errors.map(err => err.message),
          };
        } else {
          throw new Error('no data nor errors')
        }
      } catch (e) {
        if (e.graphQLErrors) {
          // Printer.debug(e);
          // console.error(e.message);
          return {
            validationErrors: [e],
            outputObj: [e.message],
          };
        } else {
          throw e;
        }
      }
    }


  }


}
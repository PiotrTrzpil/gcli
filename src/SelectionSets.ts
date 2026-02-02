import 'reflect-metadata';
import 'source-map-support/register';
import {
  FieldNode,
  GraphQLNamedType,
  GraphQLObjectType, GraphQLOutputType,
  isLeafType, isNonNullType,
  isObjectType,
  SelectionNode,
  SelectionSetNode,
} from 'graphql';
import Printer from './utils/Printer';
import * as _ from 'lodash';
import { Diagnostics } from './Diagnostics';

export interface Arg {
  name: string,
  type: string,
  value: string,
}

export class SelectionSets {

  constructor(private diagnostics: Diagnostics) {
  }

  buildSelectionSet(fieldPath: string[], leafType: GraphQLOutputType, args: Record<string, Arg[]>): SelectionSetNode | undefined {
    Printer.debug('buildSelectionSet: fieldPath', fieldPath);
    if (fieldPath.length === 0) {
      this.diagnostics.logType(leafType as GraphQLOutputType);

      if (isNonNullType(leafType) && isObjectType(leafType.ofType)) {
        return this.selectionSetForType(leafType.ofType);
      } else if (isObjectType(leafType)) {
        return this.selectionSetForType(leafType);
      } else {
        return undefined;
      }
    } else {
      return this.selectionWithSingleField(fieldPath[0], args[fieldPath[0]] || [], this.buildSelectionSet(fieldPath.slice(1), leafType, args));
    }
  }

  private selectionWithSingleField(fieldName: string, args: Arg[], innerSelection?: SelectionSetNode): SelectionSetNode {
    Printer.debug('selectionWithSingleField: fieldName', fieldName);
    const node: FieldNode = {
      kind: 'Field',
      name: {
        kind: 'Name',
        value: fieldName,
      },
      arguments: args.map((arg: Arg) => {
        const parsedInt = _.parseInt(arg.value);
        const isInteger = !_.isNaN(parsedInt) && String(parsedInt) === arg.value;
        return {
          kind: 'Argument',
          name: {
            kind: 'Name',
            value: arg.name,
          },
          value: {
            kind: isInteger ? 'IntValue' : 'StringValue',
            value: isInteger ? parsedInt : arg.value,
          },
        };
      }),
      selectionSet: innerSelection,
    } as any;
    return {
      kind: 'SelectionSet',
      selections: [node],
    };
  }

  private selectionSetForType(type: GraphQLNamedType): SelectionSetNode {
    // Printer.debug('selectionSetForType: ', type);
    const selectionSet: SelectionNode[] = [];
    if (isObjectType(type)) {
      const outputType = type as GraphQLObjectType;
      // Printer.debug('outputType:', outputType);
      // Printer.debug('outputType.getFields():', outputType.getFields());
      const fields = outputType.getFields();
      for (const fieldName in outputType.getFields()) {
        const fieldType = fields[fieldName].type;

        if (isLeafType(fieldType)) {
          const node: FieldNode = {
            kind: 'Field',
            name: {
              kind: 'Name',
              value: fieldName,
            },
            arguments: [],
          };
          selectionSet.push(node);
        }
      }
      return {
        kind: 'SelectionSet',
        selections: selectionSet,
      };
    } else {
      throw new Error(type.name + ' is not an object type');
    }
  }
}
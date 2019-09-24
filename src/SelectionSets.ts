import {
  FieldNode,
  GraphQLNamedType,
  GraphQLObjectType,
  isLeafType,
  isObjectType,
  SelectionNode,
  SelectionSetNode,
} from 'graphql';
import Printer from './Printer';
import * as _ from 'lodash';


export interface Arg {
  name: string,
  type: string,
  value: string,
}

export class SelectionSets {

  buildSelectionSet(fieldPath: string[], leafType: GraphQLNamedType, args: Record<string, Arg[]>): SelectionSetNode | undefined {
    Printer.debug('fieldPath', fieldPath);
    if (fieldPath.length === 0) {
      if (isObjectType(leafType)) {
        return this.selectionSetForType(leafType);
      } else {
        return undefined;
      }
    } else {
      return this.selectionWithSingleField(fieldPath[0], args[fieldPath[0]] || [], this.buildSelectionSet(fieldPath.slice(1), leafType, args));
    }
  }

  private selectionWithSingleField(fieldName: string, args: Arg[], innerSelection?: SelectionSetNode): SelectionSetNode {
    const node: FieldNode = {
      kind: 'Field',
      name: {
        kind: 'Name',
        value: fieldName,
      },
      arguments: args.map((arg: Arg) => ({
        kind: 'Argument',
        name: {
          kind: 'Name',
          value: arg.name,
        },
        value: {
          kind: _.parseInt(arg.value) ?  'IntValue' : 'StringValue' ,
          value: _.parseInt(arg.value) ?  _.parseInt(arg.value): arg.value,
        },
      })),
      selectionSet: innerSelection,
    } as any;
    return {
      kind: 'SelectionSet',
      selections: [node],
    };
  }

  private selectionSetForType(type: GraphQLNamedType): SelectionSetNode {

    const selectionSet: SelectionNode[] = [];
    if (isObjectType(type)) {
      const outputType = type as GraphQLObjectType;
      // Printer.debug('outputType:', outputType);
      // Printer.debug('outputType.getFields():', outputType.getFields().slice(0,4));
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
            // directives?: DirectiveNode[];
            // selectionSet?: SelectionSetNode;
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
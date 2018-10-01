import { FieldNode, GraphQLNamedType, GraphQLObjectType, isObjectType, SelectionNode, SelectionSetNode } from 'graphql';
import Printer from './Printer';

export class SelectionSets {

  buildSelectionSet(fieldPath: string[], leafType: GraphQLNamedType, args: any): SelectionSetNode | undefined {
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

  private selectionWithSingleField(fieldName: string, args: any[], innerSelection?: SelectionSetNode): SelectionSetNode {
    const node: FieldNode = {
      kind: 'Field',
      name: {
        kind: 'Name',
        value: fieldName,
      },
      arguments: args.map((arg: any) => ({
        kind: 'Argument',
        name: {
          kind: 'Name',
          value: arg.name,
        },
        value: {
          kind: 'IntValue',
          value: arg.value,
        },
      })),
      // directives?: DirectiveNode[];
      selectionSet: innerSelection,
    } as any;
    return {
      kind: 'SelectionSet',
      selections: [node],
    };
  }

  private selectionSetForType(type: GraphQLNamedType): SelectionSetNode {

    const selectionSet: SelectionNode[] = [];
    // let selectionSet = "{";
    if (isObjectType(type)) {
      const outputType = type as GraphQLObjectType;
      Printer.debug('value: ', outputType);
      for (const fieldName in outputType.getFields()) {

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

        // const fieldValue: GraphQLField = outputType.getFields()[key];
        // selectionSet = selectionSet + key + ",";
      }
      return {
        kind: 'SelectionSet',
        selections: selectionSet,
      };
      // selectionSet = selectionSet.substr(0, selectionSet.length - 1) + "}";
    } else {
      throw new Error(type.name + ' is not an object type');
    }

  }

}
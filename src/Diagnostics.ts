import 'reflect-metadata';
import 'source-map-support/register';
import Actions, { ProgramOptions } from './Actions';
import {
  DocumentNode, GraphQLEnumType,
  GraphQLField, GraphQLInputObjectType, GraphQLInterfaceType,
  GraphQLList, GraphQLNamedType,
  GraphQLNonNull, GraphQLNullableType,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLScalarType, GraphQLUnionType, print,
} from 'graphql';
import Printer from './utils/Printer';

export class Diagnostics {

  constructor() {

  }

  logQuery(doc: DocumentNode) {
    Printer.debug('\n\n------------------ QUERY ---------------------------');
    Printer.debug(print(doc as any));
    Printer.debug('----------------------------------------------------\n\n');
  }

  logField(aField: GraphQLField<any, any>) {

    const type = aField.type;
    const fieldTypeNonNull = aField.type as GraphQLNonNull<any>;
    let fieldTypeNamed;
    if (fieldTypeNonNull && fieldTypeNonNull.ofType && fieldTypeNonNull.ofType.name) {
      fieldTypeNamed = fieldTypeNonNull.ofType;
    }

    Printer.debug('fieldType', type);
    Printer.debug('fieldTypeNonNull.ofType', fieldTypeNonNull.ofType);

    if (type instanceof GraphQLNonNull) {
      Printer.debug('GraphQLNonNull', type);
      // if ((type.ofType as any).getFields) {
      //   this.genSubcommands(sywacInner, newSelectionPath, selectionArgs, type.ofType as any, accumulator);
      // } else {
      //   Printer.debug('no ofType', type);
      // }
    } else if (type instanceof GraphQLScalarType) {
      Printer.debug('GraphQLScalarType', type);
    } else if (type instanceof GraphQLObjectType) {
      Printer.debug('GraphQLObjectType', type);
    } else if (type instanceof GraphQLList && (type.ofType as any).getFields) {
      Printer.debug('GraphQLList', type);
    } else {
      Printer.debug('UNKNOWN', type);
    }
  }

// | GraphQLScalarType
// | GraphQLObjectType
// | GraphQLInterfaceType
// | GraphQLUnionType
// | GraphQLEnumType
// | GraphQLInputObjectType;

  logNamedType(type: GraphQLNamedType) {

    for (var key in type) {
      if (Object.prototype.hasOwnProperty.call(type, key)) {
        var val = (type as any)[key];
        Printer.debug('PROPERTY: ' + key + ': ' + val);
        // use val
      }
    }



    if (type instanceof GraphQLScalarType) {
      Printer.debug(type + ': GraphQLScalarType');
    } else if (type instanceof GraphQLObjectType) {
      Printer.debug(type + ': GraphQLObjectType');
    } else if (type instanceof GraphQLInterfaceType) {
      Printer.debug(type + ': GraphQLInterfaceType');
    } else if (type instanceof GraphQLUnionType) {
      Printer.debug(type + ': GraphQLUnionType');
    } else if (type instanceof GraphQLEnumType) {
      Printer.debug(type + ': GraphQLEnumType');
    } else {
      Printer.debug(type + ': UNKNOWN');
    }
  }

  logType(type: GraphQLOutputType) {
    if (type instanceof GraphQLNonNull) {
      Printer.debug(type + ': GraphQLNonNull of: ');
      this.logNullable(type.ofType);
    } else if (type instanceof GraphQLScalarType) {
      Printer.debug(type + ': GraphQLScalarType');
    } else if (type instanceof GraphQLObjectType) {
      Printer.debug(type + ': GraphQLObjectType');
    } else if (type instanceof GraphQLList && (type.ofType as any).getFields) {
      Printer.debug(type + ': GraphQLList');
    } else {
      Printer.debug(type + ': UNKNOWN');
    }
  }

  logNullable(type: GraphQLNullableType) {
    if (type instanceof GraphQLScalarType) {
      Printer.debug(type + ': GraphQLScalarType');
    } else if (type instanceof GraphQLObjectType) {
      Printer.debug(type + ': GraphQLObjectType');
    } else if (type instanceof GraphQLInterfaceType) {
      Printer.debug(type + ': GraphQLInterfaceType');
    } else if (type instanceof GraphQLUnionType) {
      Printer.debug(type + ': GraphQLUnionType');
    } else if (type instanceof GraphQLEnumType) {
      Printer.debug(type + ': GraphQLEnumType');
    } else if (type instanceof GraphQLList && (type.ofType as any).getFields) {
      Printer.debug(type + ': GraphQLList');
    } else {
      Printer.debug(type + ': UNKNOWN');
    }
  }
}
import 'reflect-metadata';
import 'source-map-support/register';
import { ApiLoader } from '../../src/ApiLoader';

export class TestProjectLoader extends ApiLoader {
  private readonly schemas: string[];

  constructor(schemas: string[]) {
    super();
    this.schemas = schemas;
  }
  //
  //
  // * getProjectNames(): IterableIterator<string> {
  //   yield 'proj1';
  // }

  getProjectNames(): IterableIterator<string> {
    return this.schemas[Symbol.iterator]();
  }
}
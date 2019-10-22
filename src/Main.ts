import 'reflect-metadata';
import 'source-map-support/register';
import SchemaConnection from './SchemaConnection';
import Actions, { ProgramOptions } from './Actions';
import { ApiLoader } from './ApiLoader';
import { Diagnostics } from './Diagnostics';

export class Main {

  constructor(private actions: Actions) {
  }

  static createFrom(
    options: ProgramOptions,
    apiLoader: ApiLoader,
    schemaLoader: SchemaConnection) {

    return new Main(
      new Actions(
        new Diagnostics(),
        options,
        apiLoader,
        schemaLoader
      )
    );
  }

  async run(input: string[]) {
    return this.actions.runOn(input)
  }
}
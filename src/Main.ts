import 'reflect-metadata';
import 'source-map-support/register';
import SchemaConnection from './SchemaConnection';
import Actions from './Actions';
import { ApiLoader } from './ApiLoader';

export class Main {

  async run(input: string[]) {

    const loader = new SchemaConnection({global: {}});
    const actions = new Actions({}, new ApiLoader(), loader);

    const output = await actions.runOn(process.argv);

  }
}
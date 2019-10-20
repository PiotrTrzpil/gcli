import 'reflect-metadata';
import 'source-map-support/register';
import SchemaLoader from './SchemaLoader';
import Actions from './Actions';
import { ApiLoader } from './ApiLoader';
import yargs = require('yargs');

export class Main {

  async run(input: string[]) {

    const loader = new SchemaLoader({global: {}});
    const actions = new Actions({}, new ApiLoader(), loader);

    const output = await actions.runOn(process.argv);

    console.log(output)


  }
}
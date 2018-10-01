#!/usr/bin/env node

import * as program from 'commander';
import Actions, { ProgramOptions } from './Actions';
import SchemaLoader from "./SchemaLoader";
import Printer from "./Printer";
import { ProjectLoader } from './ProjectLoader';

const options = (program as any) as ProgramOptions;

async function run() {
  try {
    const loader = new SchemaLoader({global: options});
    const actions = new Actions(options, new ProjectLoader(), loader);

    const output = await actions.processGraphQLConfig();

    console.log(output)
  } catch (error) {
    Printer.debug('Error on top level', error);
    console.error(error.message)
  }
}

const _ = run();

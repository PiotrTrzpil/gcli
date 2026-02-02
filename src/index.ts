#!/usr/bin/env node
import 'reflect-metadata';
import 'source-map-support/register';
import Actions, { ProgramOptions } from './Actions';
import SchemaConnection from "./SchemaConnection";
import Printer from "./utils/Printer";
import { ApiLoader } from './ApiLoader';
import { Main } from './Main';

async function run() {
  try {
    const options: ProgramOptions = {};
    const main = Main.createFrom(
      options,
      new ApiLoader(),
      new SchemaConnection({ global: options })
    );
    await main.run(process.argv.slice(2));

  } catch (error) {
    const err = error as Error | string;
    const message = err instanceof Error ? err.message : String(err);
    Printer.debug('Error on top level', error);
    console.error(message);
  }
}

run();

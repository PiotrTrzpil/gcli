#!/usr/bin/env node
import 'reflect-metadata';
import 'source-map-support/register';
import * as program from 'commander';
import Actions, { ProgramOptions } from './Actions';
import SchemaConnection from "./SchemaConnection";
import Printer from "./utils/Printer";
import { ApiLoader } from './ApiLoader';
import { Main } from './Main';

const options = (program as any) as ProgramOptions;

async function run() {
  try {

    await new Main().run(process.argv.slice(2));

  } catch (error) {
    Printer.debug('Error on top level', error);
    console.error(error.message)
  }
}

const _ = run();

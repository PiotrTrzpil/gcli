#!/usr/bin/env node

import * as program from 'commander';
import Actions, { ProgramOptions } from './actions';
import SchemaLoader from "./SchemaLoader";
import { HttpLink } from "apollo-link-http";

process.env.AWS_SDK_LOAD_CONFIG = 'true';

const withErrors = (command: (...args: any[]) => Promise<void>) => {
  return async (...args: any[]) => {
    try {
      await command(...args);
    } catch (e) {

      if (e.stack) {
        console.error(e.stack)
      } else if (e.message) {
        console.error('Error: ' + e.message);
      } else {
        console.error('Error: ' + e)
      }

      process.exitCode = 1;
    }
  };
};


const options = (program as any) as ProgramOptions;
const loader = new SchemaLoader({global: options});
const actions = new Actions(options, loader);
actions.processGraphQLConfig();

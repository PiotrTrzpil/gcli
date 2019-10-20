import 'reflect-metadata';
import 'source-map-support/register';
import { getGraphQLConfig, resolveEnvsInValues } from 'graphql-config';

export class ApiLoader {

  * getProjectNames(): IterableIterator<string> {
    const config = getGraphQLConfig(process.cwd());
    config.config = resolveEnvsInValues(config.config, process.env);

    if (config.config.projects) {
      for (const key in config.config.projects) {
        yield key;
      }
    }
  }
}
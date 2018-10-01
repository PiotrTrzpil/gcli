import { getGraphQLConfig, resolveEnvsInValues } from 'graphql-config';

export class ProjectLoader {

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
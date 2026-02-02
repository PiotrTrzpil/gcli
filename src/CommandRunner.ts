import { GraphQLOutputType } from 'graphql';
import { QueryResult, QueryRunner } from './QueryRunner';
import Printer from './utils/Printer';
import { Arg } from './SelectionSets';

export interface ResultAccumulator {
  results: CommandRunnerHolder[]
}

export class CommandRunnerHolder {
  runner?: CommandRunner
}

export class CommandRunner {
  constructor(private context: any,
              private fieldType: GraphQLOutputType,
              private selectionPath: string[]) {
  }

  async run(queryRunner: QueryRunner): Promise<QueryResult> {
    const fixedSelectionPath = this.selectionPath;
    Printer.debug('Running command:', fixedSelectionPath);
    const args = this.resolveArgs(this.context, fixedSelectionPath);

    Printer.debug('Got args:', args);
    return queryRunner.runQuery(true, fixedSelectionPath, this.fieldType, args);
  }

  resolveArgs(context: any, selectionPath: string[]): Record<string, Arg[]> {
    const flags = context.details.types.filter((type: any) => type.source === 'flag');
    Printer.debug(flags);
    const args: Record<string, Arg[]> = {};
    for (const index in selectionPath) {
      const pathPart = selectionPath[index];
      const foundTypes = flags.filter((type: any) => type.parent && type.parent.endsWith(' ' + pathPart));
      if (foundTypes.length > 0) {
        args[pathPart] = foundTypes.map((type: any) => ({
          name: type.aliases[0],
          type: type.datatype,
          value: type.value,
        } as Arg));
      }
    }
    return args;
  }
}
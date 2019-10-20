import 'reflect-metadata';
import 'source-map-support/register';
import * as util from 'util';

export default class Printer {
  public static json(obj: any, pretty: boolean = false) {
    if (pretty) {
      return JSON.stringify(obj, null, 2);
    } else {
      return JSON.stringify(obj);
    }
  }

  public static debug(...args: any[]) {
    if (process.env.DEBUG_ENABLED) {
      let combined = '';
      for (const arg in args) {
        if (typeof args[arg] === 'string') {
          combined = combined + args[arg] + ' '
        } else {
          combined = combined + Printer.insp(args[arg], process.env.DEBUG_COLORS === 'true') + ' '
        }
      }
      console.log(combined)
    }
  }

  public static insp(obj: any, colors: boolean = true) {
    return util.inspect(obj, {
      showHidden: true,
      depth: null,
      colors: colors,
    });
  }

  private static projectDir() {
    // we don't care too much if it's not true:
    return process.env.PWD;
  }

  public static errorToJson(obj: any) {
    let stack: string[] = [];
    if (obj.stack) {
      const projectDir = Printer.projectDir();
      stack = obj.stack.split('\n').map((str: string) => str.trim().replace(projectDir + '/', ''));
    }

    return {
      name: obj.name,
      path: obj.path,
      stack: stack,
    };
  }
}

import 'reflect-metadata';
import 'source-map-support/register';
import { suite, test } from 'mocha-typescript';
import * as chai from 'chai';
import 'chai/register-should';
import 'chai/register-expect';
import Actions, { ProgramOptions } from '../src/Actions';
import { TestSchemaLoader } from './framework/TestSchemaLoader';
import { TestProjectLoader } from './framework/TestProjectLoader';
import { ApiLoader } from '../src/ApiLoader';
import SchemaLoader from '../src/SchemaLoader';

const expect = chai.expect;

chai.config.includeStack = false;
chai.config.truncateThreshold = 0;


@suite class MainSpec {

  testProjectName = 'hello-world';
  @test async 'show top level api usage'() {
    const runner = this.createRunner();
    const output = await runner.execute(`--help`);
    expect(output).to.eq(`
Usage: gcli <api-name> <field> ...

Options:
  -h, --help  Show help                                                                                                                              [commands: help] [boolean]

`.trim())
  }

  @test async 'show help'() {

    const runner = this.createRunner();
    const output = await runner.execute(`${this.testProjectName} --help`);
    expect(output).to.eq(`
Usage: gcli hello-world <field> ...

Options:
  -h, --help  Show help                                                                                                                              [commands: help] [boolean]

Fields:
  nested

    `.trim())
  }

  @test async 'show field usage'() {
    const runner = this.createRunner();
    const output = await runner.execute(`${this.testProjectName} nested field`);
    expect(output).to.eq(`'Hello World'`)
  }

  logOutput(output: string) {
    console.log('\n\n----------------------------------------------------');
    console.log(output);
    console.log('----------------------------------------------------\n\n');
  }

   createRunner(options: ProgramOptions = {}) {
    const schemas = ['hello-world'];
    return new TestCliRunner(options, new TestProjectLoader(schemas), new TestSchemaLoader(schemas));
  }
}

export class TestCliRunner {

  constructor(private options: ProgramOptions,
              private apiLoader: ApiLoader,
              private schemaLoader: SchemaLoader) {
  }

  async execute(input: string): Promise<string> {
    const actions = new Actions(this.options, this.apiLoader, this.schemaLoader);
    const spl = input.split(' ');

    let initial = [''];
    if (this.options.debug || process.env.DEBUG) {
      initial = ['', '--debug']
    }

    const output = await actions.runOn(initial.concat(spl));
    return output.trim()
  }
}
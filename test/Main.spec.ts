import 'reflect-metadata';
import 'source-map-support/register';
import { suite, test } from 'mocha-typescript';
import * as chai from 'chai';
import 'chai/register-should';
import 'chai/register-expect';
import Actions, { ProgramOptions } from '../src/Actions';
import { TestSchemaConnection } from './framework/TestSchemaConnection';
import { TestProjectLoader } from './framework/TestProjectLoader';
import { ApiLoader } from '../src/ApiLoader';
import SchemaConnection from '../src/SchemaConnection';

const expect = chai.expect;

chai.config.includeStack = false;
chai.config.truncateThreshold = 0;


@suite class MainSpec {

  helloApi = 'hello-world';
  githubApi = 'github';

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
    const output = await runner.execute(`${this.helloApi} --help`);
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
    const output = await runner.execute(`${this.helloApi} nested field`);
    expect(output).to.eq(`'Hello World'`)
  }

  @test async 'show github help'() {
    const runner = this.createRunner();
    const output = await runner.execute(`${this.githubApi} --help`);
    expect(output).to.eq(`
Usage: gcli github <field> ...

Options:
  -h, --help  Show help                                                                                                                              [commands: help] [boolean]

Fields:
  codeOfConduct                             Look up a code of conduct by its key
  codesOfConduct                            Look up a code of conduct by its key
  enterprise                                Look up an enterprise by URL slug.
  enterpriseAdministratorInvitation         Look up a pending enterprise administrator invitation by invitee, enterprise and role.
  enterpriseAdministratorInvitationByToken  Look up a pending enterprise administrator invitation by invitation token.
  license                                   Look up an open source license by its key
  licenses                                  Return a list of known open source licenses
  marketplaceCategories                     Get alphabetically sorted list of Marketplace categories
  marketplaceCategory                       Look up a Marketplace category by its slug.
  marketplaceListing                        Look up a single Marketplace listing
  marketplaceListings                       Look up Marketplace listings
  meta                                      Return information about the GitHub instance
  node                                      Fetches an object given its ID.
  nodes                                     Lookup nodes by a list of IDs.
  organization                              Lookup a organization by login.
  rateLimit                                 The client's rate limit information.
  relay                                     Hack to workaround https://github.com/facebook/relay/issues/112 re-exposing the root query object
  repository                                Lookup a given repository by the owner and repository name.
  repositoryOwner                           Lookup a repository owner (ie. either a User or an Organization) by login.
  resource                                  Lookup resource by a URL.
  search                                    Perform a search across resources.
  securityAdvisories                        GitHub Security Advisories
  securityAdvisory                          Fetch a Security Advisory by its GHSA ID
  securityVulnerabilities                   Software Vulnerabilities documented by GitHub Security Advisories
  sponsorsListing                           Look up a single Sponsors Listing
  topic                                     Look up a topic by name.
  user                                      Lookup a user by login.
  viewer                                    The currently authenticated user.

      `.trim())
  }

  @test async 'github - access a string field'() {
    const runner = this.createRunner();
    const output = await runner.execute(`${this.githubApi} viewer name`);
    expect(output).to.eq(`'some-github-user'`)
  }

  logOutput(output: string) {
    console.log('\n\n----------------------------------------------------');
    console.log(output);
    console.log('----------------------------------------------------\n\n');
  }

   createRunner(options: ProgramOptions = {}) {
    const schemas = [this.helloApi, this.githubApi];
    return new TestCliRunner(options, new TestProjectLoader(schemas), new TestSchemaConnection(schemas));
  }
}

export class TestCliRunner {

  constructor(private options: ProgramOptions,
              private apiLoader: ApiLoader,
              private schemaLoader: SchemaConnection) {
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
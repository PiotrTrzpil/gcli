import 'reflect-metadata';
import 'source-map-support/register';
import { suite, test } from 'mocha-typescript';
import * as chai from 'chai';
import 'chai/register-should';
import 'chai/register-expect';
import * as fs from 'fs';
import { addMockFunctionsToSchema, makeExecutableSchema } from 'graphql-tools';
import Actions from '../src/Actions';
import { TestSchemaConnection } from './framework/TestSchemaConnection';
import { TestProjectLoader } from './framework/TestProjectLoader';
import { Main } from '../src/Main';
import { ApiLoader } from '../src/ApiLoader';

const expect = chai.expect;

chai.config.includeStack = false;
chai.config.truncateThreshold = 0;

// process.env.DEBUG_ENABLED = 'true';
process.env.DEBUG_COLORS = 'true';


@suite class ProjectLoaderSpec {

  // static before() {
  //   const schemaString = fs.readFileSync('./src/test-schema.graphql').toString();
  //   const schema = makeExecutableSchema({ typeDefs: schemaString as any });
  //
  //   addMockFunctionsToSchema({ schema });
  //   return Promise.resolve(schema);
  // }

  // @test async 'show usage by default'() {
  //   console.log("---------------");
  //
  //   const loader = new ApiLoader();
  //   console.log(Array.from(loader.getProjectNames()))
  //
  //   // await main.run("--help".split(" "));
  //   // console.log("2--------------");
  //
  //   expect(2).to.eq(23)
  // }
}




# gcli

[![npm version](https://img.shields.io/npm/v/@piotrtrzpil/gcli.svg)](https://www.npmjs.com/package/@piotrtrzpil/gcli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**A universal command-line interface for any GraphQL server.**

gcli dynamically transforms a GraphQL schema into a fully functional CLI. Query any GraphQL API directly from your terminal with auto-generated commands, tab completion-friendly field names, and contextual help that shows available fields at each level of your query.

## Features

- **Works with any GraphQL server** - GitHub, Shopify, Hasura, or your own API
- **Auto-generated help** - See available fields and types at any point in your query
- **Schema introspection** - Commands are built dynamically from the GraphQL schema
- **Simple syntax** - Just chain field names as CLI arguments
- **Scalar parameters** - Pass arguments inline to filter and customize queries

## Installation

### Prerequisites

- Node.js 8.0 or higher
- [graphql-cli](https://github.com/graphql-cli/graphql-cli) for project configuration

### Install gcli

```bash
npm install -g @piotrtrzpil/gcli
```

### Configure a GraphQL endpoint

1. Create a project directory and initialize graphql-cli:

```bash
mkdir my-graphql-project && cd my-graphql-project
npx graphql-cli init
```

2. Follow the prompts to set up your endpoint. This creates a `.graphqlconfig.yaml` file:

```yaml
projects:
  github:
    schemaPath: schema.graphql
    extensions:
      endpoints:
        default: https://api.github.com/graphql
```

The project name (e.g., `github`) becomes your gcli command prefix.

## Usage

### Basic queries

Query fields by chaining them as arguments:

```bash
# Get your GitHub profile URL
gcli github viewer url

# Get a repository description
gcli github viewer repository --name gcli description
```

### Exploring the schema

Use `--help` at any level to see available fields:

```bash
$ gcli github --help
Usage: gcli github <field> ...

Fields:
  codeOfConduct          Look up a code of conduct by its key
  codesOfConduct         Look up a code of conduct by its key
  license                Look up an open source license by its key
  licenses               Return a list of known open source licenses
  marketplaceCategories  Get alphabetically sorted list of Marketplace categories
  marketplaceCategory    Look up a Marketplace category by its slug
  marketplaceListing     Look up a single Marketplace listing
  marketplaceListings    Look up Marketplace listings
  meta                   Return information about the GitHub instance
  viewer                 The currently authenticated user
```

### Passing arguments

Use `--argName value` syntax for fields that accept parameters:

```bash
# Get a specific repository
gcli github viewer repository --name "my-repo" description stargazerCount

# Look up a license
gcli github license --key mit name description
```

## How it works

1. gcli reads your `.graphqlconfig.yaml` to find configured GraphQL endpoints
2. It introspects the schema to discover available types and fields
3. Your CLI arguments are parsed and converted into a GraphQL query
4. The query is executed and results are printed to stdout

## Roadmap

- [ ] Mutation support
- [ ] Multiple field selection in single query
- [ ] Output formatting options (JSON, table)
- [ ] Shell completion scripts

## License

MIT © Piotr Trzpil

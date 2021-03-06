# gcli

Have a CLI to all GraphQL servers!

gCLI transforms a GraphQL schema into a CLI, allowing you to query, run mutations (in the future) and see relevant fields you can query via generated help.

## Setup

1. Install https://github.com/graphql-cli/graphql-cli

2. In a directory of your choice, run `graphql init` and setup a project with a default endpoint.

This will create .graphqlconfig.yaml file that then will be used by gcli. The project name will be used in commands, e.g.:

```
gcli github viewer url
```

Help shows fields of a type on the given selection set:

```
➜ ✗ gcli github --help
Usage: gcli github <field> ...

Options:
  -h, --help  Show help                                                                                                                              [commands: help] [boolean]

Fields:
  codeOfConduct          Look up a code of conduct by its key
  codesOfConduct         Look up a code of conduct by its key
  license                Look up an open source license by its key
  licenses               Return a list of known open source licenses
  marketplaceCategories  Get alphabetically sorted list of Marketplace categories
  marketplaceCategory    Look up a Marketplace category by its slug.
  marketplaceListing     Look up a single Marketplace listing
  marketplaceListings    Look up Marketplace listings
  meta                   Return information about the GitHub instance
```

You can use scalar parameters and query sub-fields:

```
➜ ✗ gcli github viewer repository --name gcli description
'Command line interface for any GraphQL server'
```

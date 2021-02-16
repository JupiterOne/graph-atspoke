# JupiterOne Integration

## Development Environment

### Prerequisites

You must have Node.JS installed to run this project. If you don't already have
it installed, you can can download the installer
[here](https://nodejs.org/en/download/). You can alternatively install Node.JS
using a version manager like [fnm](https://github.com/Schniz/fnm) or
[nvm](https://github.com/nvm-sh/nvm).

### Setup

#### Installing dependencies

First, you'll need to
[install `yarn`](https://yarnpkg.com/getting-started/install). Then, from the
root of this project, run `yarn install` to install dependencies.

#### Loading configuration

An integration executes against a configuration that provides credentials and
any other information necessary to ingest data from the provider. The
configuration fields are defined in `src/instanceConfigFields.ts` while the
configuration values are stored in a `.env` file at the root of this project.
This allows the integration to automatically load the field values and complain
when they're not provided.

Create a `.env` file at the root of this project and add environment variables
to match what is in `src/instanceConfigFields.ts`. The `.env` file is ignored by
git, so you won't have to worry about accidentally pushing credentials.

Given this example configuration:

```typescript
import { IntegrationInstanceConfigFieldMap } from '@jupiterone/integration-sdk-core';

const instanceConfigFields: IntegrationInstanceConfigFieldMap = {
  apiKey: {
    type: 'string',
    mask: true,
  },
  numRequests: {
    type: 'string',
  },
};

export default instanceConfigFields;
```

You would provide a `.env` file like this:

```bash
API_KEY="gobbeldygookgobbeldygook="
NUM_REQUESTS="10"
```

The snake cased environment variables will automatically be converted and
applied to the camel cased configuration field. So for example, `API_KEY` will
apply to the `apiKey` config field. If there were more fields, `NUM_REQUESTS`
would apply to `numRequests`, and `MY_SUPER_SECRET_CONFIGURATION_VALUE` would
apply to a `mySuperSecretConfigurationValue` configuration field.

## Getting an API Key from atSpoke

To get an API Key from atSpoke, go to My Profile, select the API tab, and then
generate a token at the bottom of the page. Note you can only have one token for
the whole atSpoke account, and it has access to all things. Also note that you
can only create an API token if you have a Business or Enterprise level account
(the basic Teams account does not provide API functionality).

## Configuring the number of requests desired in your JupiterOne graph

Requests are the support tickets in atSpoke. You can configure this integration
to pull in the most recent X number of tickets with the env variable
NUM_REQUESTS="X". If you set X to 0, atSpoke requests will not be pulled in to
the graph. Note that the current max for X is 100. Invalid entries (letters,
negative numbers, numbers above 100), will be treated as 0.

## Running the integration

To start collecting data, run `yarn start` from the root of the project. This
will load in your configuration from `src/index.ts`.

## Documentation

### Development

Please reference the JupiterOne integration
[development documentation](https://github.com/JupiterOne/sdk/blob/master/docs/integrations/development.md)
for more information on how to use the SDK.

See [docs/development.md](docs/development.md) for details about how to get
started with developing this integration.

### Integration usage and resource coverage

More information about the resources covered by this integration and how to
setup the integration in JupiterOne can be found in
[docs/jupiterone.md](docs/jupiterone.md).

### Changelog

The history of this integration's development can be viewed at
[CHANGELOG.md](CHANGELOG.md).

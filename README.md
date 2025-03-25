# `@herp-inc/cycle-launchdarkly-driver` [![npm](https://img.shields.io/npm/v/@herp-inc/cycle-launchdarkly-driver)](https://www.npmjs.com/package/@herp-inc/cycle-launchdarkly-driver)

[LaunchDarkly](https://launchdarkly.com/) driver for [Cycle.js](https://cycle.js.org/), based on [Standard Schema
](https://standardschema.dev/).

## Installation

Note that the following packages are peer dependencies of this library, which need to be installed separately.

| Package                                                                                  | Version |
| ---------------------------------------------------------------------------------------- | ------- |
| [`launchdarkly-js-client-sdk`](https://www.npmjs.com/package/launchdarkly-js-client-sdk) | `3`     |
| [`xstream`](https://www.npmjs.com/package/xstream)                                       | `11`    |

```sh
$ yarn add @herp-inc/cycle-launchdarkly-driver
```

## Example

```typescript
import { run } from '@cycle/run';
import { makeDOMDriver } from '@cycle/dom';
import { makeLaunchDarklyDriver } from '@herp-inc/cycle-launchdarkly-driver';
import * as z from 'zod';

type Features = {
  foo: boolean;
  bar: number;
  baz: string;
};

const Features = {
  schema: z.object({
    foo: z.boolean(),
    bar: z.number(),
    baz: z.string(),
  }),
  defaultValues: {
    foo: false,
    bar: 0,
    baz: '',
  },
};

type Sources = { features: FeaturesSource<Features> };
type Sinks = { DOM: Stream<VNode> };

function main({ features }: Sources): Sinks {
  return {
    DOM: features.stream.map(view),
  };
}

const drivers = {
  features: makeLaunchDarklyDriver({
    envKey: YOUR_CLIENT_SIDE_ID,
    defaultValues: FeatureFlags.defaultValues,
    fallbackDelay: 100,
    options: {
      bootstrap: 'localStorage',
    },
    schema: FeatureFlags.schema,
    user: {
      key: user.id,
    },
  }),
  DOM: makeDOMDriver('#app'),
};

run(main, drivers);
```

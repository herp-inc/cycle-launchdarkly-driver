# `@herp-inc/cycle-launchdarkly-driver` [![npm](https://img.shields.io/npm/v/@herp-inc/cycle-launchdarkly-driver)](https://www.npmjs.com/package/@herp-inc/cycle-launchdarkly-driver)

[LaunchDarkly](https://launchdarkly.com/) driver for [Cycle.js](https://cycle.js.org/), based on [fp-ts](https://gcanti.github.io/fp-ts/) and [io-ts](https://gcanti.github.io/fp-ts/)

## Installation

Note that the following packages are peer dependencies of this library, which need to be installed separately.

| Package                                                                                  | Version |
| ---------------------------------------------------------------------------------------- | ------- |
| [`fp-ts`](https://www.npmjs.com/package/fp-ts)                                           | `^2.11` |
| [`io-ts`](https://www.npmjs.com/package/io-ts)                                           | `^2.2`  |
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
import * as t from 'io-ts/Decoder';

type Features = {
  foo: boolean;
  bar: number;
  baz: string;
};

const Features = {
  decoder: t.type({
    foo: t.boolean,
    bar: t.number,
    baz: t.string,
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
    decoder: FeatureFlags.decoder,
    defaultValues: FeatureFlags.defaultValues,
    fallbackDelay: 100,
    options: {
      bootstrap: 'localStorage',
    },
    user: {
      key: user.id,
    },
  }),
  DOM: makeDOMDriver('#app'),
};

run(main, drivers);
```

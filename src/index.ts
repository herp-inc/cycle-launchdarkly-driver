import type { Driver } from '@cycle/run';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import * as LaunchDarkly from 'launchdarkly-js-client-sdk';
import { Stream } from 'xstream';
import type { MemoryStream } from 'xstream';
import delay from 'xstream/extra/delay';

type Either<E, A> =
    | {
          _tag: 'Left';
          left: E;
      }
    | {
          _tag: 'Right';
          right: A;
      };

type Decoder<I, A> = {
    decode: (input: I) => Either<unknown, A>;
};

type Dictionary = Readonly<{ [_: string]: unknown }>;

interface FeaturesSource<Features extends Dictionary> {
    readonly stream: MemoryStream<Features>;
}

type LDParams = Parameters<typeof LaunchDarkly.initialize>;

type SchemaParams<Features extends Dictionary> = Readonly<
    | {
          decoder?: undefined;
          /**
           * The schema for the feature flags.
           */
          schema: StandardSchemaV1<unknown, Features>;
      }
    | {
          /**
           * The decoder for the feature flags.
           *
           * @deprecated Use `schema` option instead.
           */
          decoder: Decoder<unknown, Features>;
          schema?: undefined;
      }
>;

type Params<Features extends Dictionary> = Readonly<{
    /**
     * The initial context properties.
     */
    context: LDParams[1];
    /**
     * The default values of the feature flags.
     */
    defaultValues: Features;
    /**
     * The client-side ID.
     */
    envKey: LDParams[0];
    /**
     * When the LaunchDarkly client initialization exceeds this duration, the default values will be emitted to the sink.
     * In milliseconds.
     */
    fallbackDelay?: number | undefined;
    /**
     * Optional configuration settings.
     */
    options?: LDParams[2];
}> &
    SchemaParams<Features>;

type LegacyParams<Features extends Dictionary> = Omit<Params<Features>, 'context'> &
    Readonly<{
        /**
         * The initial user properties.
         *
         * @deprecated Use `context` option instead.
         */
        user: LDParams[1];
    }>;

function makeClient$(...[envKey, context, options]: LDParams): Stream<LaunchDarkly.LDClient> {
    let client: LaunchDarkly.LDClient | undefined;

    return Stream.create<LaunchDarkly.LDClient>({
        start: (listener) => {
            client = LaunchDarkly.initialize(envKey, context, options);

            void client.waitForInitialization().then(() => {
                if (client === undefined) {
                    return;
                }
                listener.next(client);
            });
        },
        stop: () => {
            void client?.close();
            client = undefined;
        },
    });
}

/**
 * A factory function for the LaunchDarkly driver.
 */
function makeLaunchDarklyDriver<Features extends Dictionary>(
    params: Params<Features> | LegacyParams<Features>,
): Driver<void, FeaturesSource<Features>> {
    const { defaultValues, envKey, fallbackDelay = 0, options } = params;
    const context = 'context' in params ? params.context : params.user;

    const client$ = makeClient$(envKey, context, options);
    const $ = client$.map((client) => {
        let onNext: () => void;

        return Stream.create<Features>({
            start(listener) {
                onNext = (): void => {
                    const allFlags = client.allFlags();

                    if (params.schema === undefined) {
                        const result = params.decoder!.decode(allFlags);

                        if (result._tag === 'Right') {
                            listener.next(result.right);
                        } else {
                            options?.logger?.warn(`Failed to decode the flags: ${JSON.stringify(allFlags)}`);
                        }
                    } else {
                        const result = params.schema['~standard'].validate(allFlags);
                        if (result instanceof Promise) {
                            throw new TypeError('Schema validation must be synchronous');
                        }

                        if (result.issues === undefined) {
                            listener.next(result.value);
                        } else {
                            options?.logger?.warn(`Failed to decode the flags: ${JSON.stringify(allFlags)}`);
                        }
                    }
                };

                client.on('change', onNext);

                onNext();
            },
            stop() {
                client.off('change', onNext);
            },
        });
    });

    const defaultValues$ = Stream.of(defaultValues).compose(delay(fallbackDelay));

    return () => ({
        stream: $.startWith(defaultValues$).flatten().remember(),
    });
}

/**
 * A factory function to create a mocked `FeaturesSource`, for testing purposes.
 */
function makeMockFeaturesDriver<Features extends Dictionary>(
    $: Stream<Features>,
): Driver<void, FeaturesSource<Features>> {
    return () => ({ stream: $ });
}

export type { FeaturesSource, Params };
export { makeLaunchDarklyDriver, makeMockFeaturesDriver };

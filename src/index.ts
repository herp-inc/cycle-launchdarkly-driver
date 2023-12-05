import type { Driver } from '@cycle/run';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import type { Decoder } from 'io-ts/Decoder';
import * as LaunchDarkly from 'launchdarkly-js-client-sdk';
import { type MemoryStream, Stream } from 'xstream';
import delay from 'xstream/extra/delay';

type Dictionary = Readonly<{ [_: string]: unknown }>;

export interface FeaturesSource<Features extends Dictionary> {
    readonly stream: MemoryStream<Features>;
}

type LDParams = Parameters<typeof LaunchDarkly.initialize>;

export type Params<Features extends Dictionary> = Readonly<{
    /**
     * The decoder for the feature flags.
     */
    decoder: Decoder<unknown, Features>;
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
    /**
     * The initial user properties.
     */
    user: LDParams[1];
}>;

function makeClient$(...[envKey, user, options]: LDParams): Stream<LaunchDarkly.LDClient> {
    let client: LaunchDarkly.LDClient | undefined;

    return Stream.create<LaunchDarkly.LDClient>({
        start: (listener) => {
            client = LaunchDarkly.initialize(envKey, user, options);

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
export function makeLaunchDarklyDriver<Features extends Dictionary>({
    decoder,
    defaultValues,
    envKey,
    fallbackDelay = 0,
    options,
    user,
}: Params<Features>): Driver<void, FeaturesSource<Features>> {
    const client$ = makeClient$(envKey, user, options);
    const $ = client$.map((client) => {
        let onNext: () => void;

        return Stream.create<Features>({
            start(listener) {
                onNext = (): void => {
                    const allFlags = client.allFlags();
                    const flags = decoder.decode(allFlags);

                    const action = pipe(
                        flags,
                        E.fold(
                            () => () =>
                                options?.logger?.warn(`Failed to decode the flags: ${JSON.stringify(allFlags)}`),
                            (flags) => () => {
                                listener.next(flags);
                            },
                        ),
                    );

                    action();
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
export function makeMockFeaturesDriver<Features extends Dictionary>(
    $: Stream<Features>,
): Driver<void, FeaturesSource<Features>> {
    return () => ({ stream: $ });
}

import type { Driver } from '@cycle/run';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import type { Decoder } from 'io-ts/Decoder';
import * as LaunchDarkly from 'launchdarkly-js-client-sdk';
import { type MemoryStream, Stream } from 'xstream';

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
     * Optional configuration settings.
     */
    options?: LDParams[2];
    /**
     * The initial user properties.
     */
    user: LDParams[1];
}>;

/**
 * A factory function for the LaunchDarkly driver.
 */
export function makeLaunchDarklyDriver<Features extends Dictionary>({
    decoder,
    defaultValues,
    envKey,
    options,
    user,
}: Params<Features>): Driver<void, FeaturesSource<Features>> {
    let client: LaunchDarkly.LDClient;

    return () => ({
        stream: Stream.create<Features>({
            start(listener) {
                const emit = (): void => {
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

                client = LaunchDarkly.initialize(envKey, user, options);

                client.on('change', emit);
                client.on('ready', emit);

                client.on('error', listener.error);
                client.on('failed', listener.error);
            },
            async stop() {
                await client?.close();
            },
        }).startWith(defaultValues),
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

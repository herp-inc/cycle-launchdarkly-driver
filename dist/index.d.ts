import type { Driver } from '@cycle/run';
import type { Decoder } from 'io-ts/Decoder';
import * as LaunchDarkly from 'launchdarkly-js-client-sdk';
import { type MemoryStream, Stream } from 'xstream';
declare type Dictionary = Readonly<{
    [_: string]: unknown;
}>;
export interface FeaturesSource<Features extends Dictionary> {
    readonly stream: MemoryStream<Features>;
}
declare type LDParams = Parameters<typeof LaunchDarkly.initialize>;
export declare type Params<Features extends Dictionary> = Readonly<{
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
/**
 * A factory function for the LaunchDarkly driver.
 */
export declare function makeLaunchDarklyDriver<Features extends Dictionary>({ decoder, defaultValues, envKey, fallbackDelay, options, user, }: Params<Features>): Driver<void, FeaturesSource<Features>>;
/**
 * A factory function to create a mocked `FeaturesSource`, for testing purposes.
 */
export declare function makeMockFeaturesDriver<Features extends Dictionary>($: Stream<Features>): Driver<void, FeaturesSource<Features>>;
export {};

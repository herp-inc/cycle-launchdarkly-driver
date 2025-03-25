import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import * as LaunchDarkly from 'launchdarkly-js-client-sdk';
import { Stream } from 'xstream';
import delay from 'xstream/extra/delay';

function makeClient$(...[envKey, user, options]) {
    let client;
    return Stream.create({
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
function makeLaunchDarklyDriver({ decoder, defaultValues, envKey, fallbackDelay = 0, options, user, }) {
    const client$ = makeClient$(envKey, user, options);
    const $ = client$.map((client) => {
        let onNext;
        let onError;
        return Stream.create({
            start(listener) {
                onNext = () => {
                    const allFlags = client.allFlags();
                    const flags = decoder.decode(allFlags);
                    const action = pipe(flags, E.fold(() => () => options?.logger?.warn(`Failed to decode the flags: ${JSON.stringify(allFlags)}`), (flags) => () => {
                        listener.next(flags);
                    }));
                    action();
                };
                onError = listener.error;
                client.on('change', onNext);
                client.on('error', listener.error);
                client.on('failed', listener.error);
                onNext();
            },
            stop() {
                client.off('change', onNext);
                client.off('error', onError);
                client.on('failed', onError);
            },
        });
    });
    const defaultValues$ = Stream.of(defaultValues).compose(delay(fallbackDelay));
    return () => ({
        stream: $.startWith(defaultValues$).flatten(),
    });
}
/**
 * A factory function to create a mocked `FeaturesSource`, for testing purposes.
 */
function makeMockFeaturesDriver($) {
    return () => ({ stream: $ });
}

export { makeLaunchDarklyDriver, makeMockFeaturesDriver };

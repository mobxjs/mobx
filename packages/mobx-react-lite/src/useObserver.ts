import { Reaction, _getGlobalState } from "mobx"
import React from "react"
import { printDebugValue } from "./utils/printDebugValue"
import {
    addReactionToTrack,
    IReactionTracking,
    recordReactionAsCommitted
} from "./utils/reactionCleanupTracking"
import { isUsingStaticRendering } from "./staticRendering"
import { ObserverInstance } from "./observer"
import { observerFinalizationRegistry } from "./utils/observerFinalizationRegistry"

function observerComponentNameFor(baseComponentName: string) {
    return `observer${baseComponentName}`
}

const mobxGlobalState = _getGlobalState()

// BC
const globalStateVersionIsAvailable = typeof mobxGlobalState.globalVersion !== "undefined" // TODO
//const globalStateVersionIsAvailable = false; // TODO

/**
 * We use class to make it easier to detect in heap snapshots by name
 */
class ObjectToBeRetainedByReact {}

function objectToBeRetainedByReactFactory() {
    return new ObjectToBeRetainedByReact()
}

export function useLegacyObserver<T>(fn: () => T, baseComponentName: string = "observed"): T {
    if (isUsingStaticRendering()) {
        return fn()
    }

    const [objectRetainedByReact] = React.useState(objectToBeRetainedByReactFactory)
    // Force update, see #2982
    const [, setState] = React.useState()
    const forceUpdate = () => setState([] as any)

    // StrictMode/ConcurrentMode/Suspense may mean that our component is
    // rendered and abandoned multiple times, so we need to track leaked
    // Reactions.
    const reactionTrackingRef = React.useRef<IReactionTracking | null>(null)

    if (!reactionTrackingRef.current) {
        // First render for this component (or first time since a previous
        // reaction from an abandoned render was disposed).

        const newReaction = new Reaction(observerComponentNameFor(baseComponentName), () => {
            // Observable has changed, meaning we want to re-render
            // BUT if we're a component that hasn't yet got to the useEffect()
            // stage, we might be a component that _started_ to render, but
            // got dropped, and we don't want to make state changes then.
            // (It triggers warnings in StrictMode, for a start.)
            if (trackingData.mounted) {
                // We have reached useEffect(), so we're mounted, and can trigger an update
                forceUpdate()
            } else {
                // We haven't yet reached useEffect(), so we'll need to trigger a re-render
                // when (and if) useEffect() arrives.
                trackingData.changedBeforeMount = true
            }
        })

        const trackingData = addReactionToTrack(
            reactionTrackingRef,
            newReaction,
            objectRetainedByReact
        )
    }

    const { reaction } = reactionTrackingRef.current!
    React.useDebugValue(reaction, printDebugValue)

    React.useEffect(() => {
        // Called on first mount only
        recordReactionAsCommitted(reactionTrackingRef)

        if (reactionTrackingRef.current) {
            // Great. We've already got our reaction from our render;
            // all we need to do is to record that it's now mounted,
            // to allow future observable changes to trigger re-renders
            reactionTrackingRef.current.mounted = true
            // Got a change before first mount, force an update
            if (reactionTrackingRef.current.changedBeforeMount) {
                reactionTrackingRef.current.changedBeforeMount = false
                forceUpdate()
            }
        } else {
            // The reaction we set up in our render has been disposed.
            // This can be due to bad timings of renderings, e.g. our
            // component was paused for a _very_ long time, and our
            // reaction got cleaned up

            // Re-create the reaction
            reactionTrackingRef.current = {
                reaction: new Reaction(observerComponentNameFor(baseComponentName), () => {
                    // We've definitely already been mounted at this point
                    forceUpdate()
                }),
                mounted: true,
                changedBeforeMount: false,
                cleanAt: Infinity
            }
            forceUpdate()
        }

        return () => {
            reactionTrackingRef.current!.reaction.dispose()
            reactionTrackingRef.current = null
        }
    }, [])

    // render the original component, but have the
    // reaction track the observables, so that rendering
    // can be invalidated (see above) once a dependency changes
    let rendering!: T
    let exception
    reaction.track(() => {
        try {
            rendering = fn()
        } catch (e) {
            exception = e
        }
    })

    if (exception) {
        throw exception // re-throw any exceptions caught during rendering
    }

    return rendering
}

function createReaction(instance: ObserverInstance) {
    instance.reaction = new Reaction(observerComponentNameFor(instance.componentName), () => {
        if (!globalStateVersionIsAvailable) {
            // BC
            instance.stateVersion = Symbol()
        }
        // Force update won't be avaliable until the component "mounts".
        // If state changes in between initial render and mount,
        // `useExternalSyncStore` should handle that by checking the state version and issuing update.
        instance.forceUpdate?.()
    })
}

/*
function scheduleReactionDisposal(instance: ObserverInstance) {}

function cancelReactionDisposal(instance: ObserverInstance) {}
*/
function disposeReaction(instance: ObserverInstance) {
    instance.reaction?.dispose()
    instance.reaction = null
}

// reset/tearDown/suspend/detach
function dispose(instance: ObserverInstance) {
    instance.forceUpdate = null
    disposeReaction(instance)
}

export function useObserver<T>(render: () => T, baseComponentName: string = "observed"): T {
    if (isUsingStaticRendering()) {
        return render()
    }

    // Force update, see #2982
    const [, setState] = React.useState()
    const forceUpdate = () => setState([] as any)

    // StrictMode/ConcurrentMode/Suspense may mean that our component is
    // rendered and abandoned multiple times, so we need to track leaked
    // Reactions.
    const instanceRef = React.useRef<ObserverInstance | null>(null)
    const [finalizationRegistryTarget] = React.useState(objectToBeRetainedByReactFactory)

    if (!instanceRef.current) {
        const instance: ObserverInstance = {
            reaction: null,
            forceUpdate: null,
            stateVersion: Symbol(),
            componentName: baseComponentName
        }
        // Opt: instead of useMemo we keep these on instance
        // @ts-ignore
        ;(instance.subscribe = (onStoreChange: () => void) => {
            // Do NOT access instanceRef here!
            //console.log('SUBSCRIBE');
            observerFinalizationRegistry.unregister(instance)
            //const instance = instanceRef.current!
            instance.forceUpdate = onStoreChange
            if (!instance.reaction) {
                createReaction(instance)
                // We've lost our reaction and therefore all the subscriptions.
                // We have to schedule re-render to recreate subscriptions,
                // even if state did not change.
                // TODO or we could jus transfer dependencies
                //console.log('REACTION  LOST, FORCING UPDATE');
                instance.forceUpdate()
            }

            return () => {
                // Do NOT access instanceRef here!
                //console.log('UNSUBSCRIBE');
                //dispose(instanceRef.current!)
                dispose(instance)
            }
        }),
            // @ts-ignore
            (instance.getSnapshot = () =>
                globalStateVersionIsAvailable
                    ? mobxGlobalState.stateVersion
                    : //: instanceRef.current?.stateVersion
                      instance.stateVersion)

        createReaction(instance)

        instanceRef.current = instance
        observerFinalizationRegistry.register(instanceRef, instance, instance)
    }

    const instance = instanceRef.current!
    React.useDebugValue(instance.reaction!, printDebugValue)

    // const subscribe = React.useCallback((onStoreChange: () => void) => {
    //     console.log('SUBSCRIBE');
    //     observerFinalizationRegistry.unregister(instanceRef)
    //     const instance = instanceRef.current!
    //     instance.forceUpdate = onStoreChange
    //     if (!instance.reaction) {
    //         createReaction(instance)
    //         // We've lost our reaction and therefore all the subscriptions.
    //         // We have to schedule re-render to recreate subscriptions,
    //         // even if state did not change.
    //         // TODO our we could jus transfer dependencies
    //         console.log('REACTION  LOST, FORCING UPDATE');
    //         instance.forceUpdate();
    //     }

    //     return () => {
    //         console.log('UNSUBSCRIBE');
    //         dispose(instanceRef.current!)
    //     }
    // }, []);

    React.useSyncExternalStore(
        // Both of these must be stable, otherwise it would keep resubscribing every render.
        // @ts-ignore
        instance.subscribe,
        // @ts-ignore
        instance.getSnapshot
        // () =>
        //     globalStateVersionIsAvailable
        //         ? mobxGlobalState.stateVersion
        //         : instanceRef.current?.stateVersion
    )

    // render the original component, but have the
    // reaction track the observables, so that rendering
    // can be invalidated (see above) once a dependency changes
    let renderResult!: T
    let exception
    instance.reaction!.track(() => {
        try {
            renderResult = render()
        } catch (e) {
            exception = e
        }
    })

    if (exception) {
        throw exception // re-throw any exceptions caught during rendering
    }

    return renderResult
}

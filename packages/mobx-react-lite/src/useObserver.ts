import { Reaction, _getGlobalState } from "mobx"
import React from "react"
import { printDebugValue } from "./utils/printDebugValue"
import { isUsingStaticRendering } from "./staticRendering"
import { observerFinalizationRegistry } from "./utils/observerFinalizationRegistry"

// Do not store `admRef` (even as part of a closure!) on this object,
// otherwise it will prevent GC and therefore reaction disposal via FinalizationRegistry.
type ObserverAdministration = {
    reaction: Reaction | null // also serves as disposed flag
    forceUpdate: Function | null // also serves as mounted flag
    // BC: we will use local state version if global isn't available.
    // It should behave as previous implementation - tearing is still present,
    // because there is no cross component synchronization,
    // but we can use `useExternalSyncStore` API.
    stateVersion: any
    name: string
    // These don't depend on state/props, therefore we can keep them here instead of `useCallback`
    subscribe: Parameters<typeof React.useSyncExternalStore>[0]
    getSnapshot: Parameters<typeof React.useSyncExternalStore>[1]
}

const mobxGlobalState = _getGlobalState()

// BC
const globalStateVersionIsAvailable = typeof mobxGlobalState.globalVersion !== "undefined"

function createReaction(adm: ObserverAdministration) {
    adm.reaction = new Reaction(`observer${adm.name}`, () => {
        if (!globalStateVersionIsAvailable) {
            // BC
            adm.stateVersion = Symbol()
        }
        // Force update won't be avaliable until the component "mounts".
        // If state changes in between initial render and mount,
        // `useExternalSyncStore` should handle that by checking the state version and issuing update.
        adm.forceUpdate?.()
    })
}

export function useObserver<T>(render: () => T, baseComponentName: string = "observed"): T {
    if (isUsingStaticRendering()) {
        return render()
    }

    const admRef = React.useRef<ObserverAdministration | null>(null)

    if (!admRef.current) {
        const adm: ObserverAdministration = {
            reaction: null,
            forceUpdate: null,
            stateVersion: Symbol(),
            name: baseComponentName,
            subscribe(onStoreChange: () => void) {
                // Do NOT access admRef here!
                observerFinalizationRegistry.unregister(adm)
                adm.forceUpdate = onStoreChange
                if (!adm.reaction) {
                    // We've lost our reaction and therefore all subscriptions.
                    // We have to recreate reaction and schedule re-render to recreate subscriptions,
                    // even if state did not change.
                    createReaction(adm)
                    adm.forceUpdate()
                }

                return () => {
                    // Do NOT access admRef here!
                    adm.forceUpdate = null
                    adm.reaction?.dispose()
                    adm.reaction = null
                }
            },
            getSnapshot() {
                // Do NOT access admRef here!
                return globalStateVersionIsAvailable
                    ? mobxGlobalState.stateVersion
                    : adm.stateVersion
            }
        }

        createReaction(adm)

        admRef.current = adm

        // StrictMode/ConcurrentMode/Suspense may mean that our component is
        // rendered and abandoned multiple times, so we need to track leaked
        // Reactions.
        observerFinalizationRegistry.register(admRef, adm, adm)
    }

    const adm = admRef.current!
    React.useDebugValue(adm.reaction!, printDebugValue)

    React.useSyncExternalStore(
        // Both of these must be stable, otherwise it would keep resubscribing every render.
        adm.subscribe,
        adm.getSnapshot
    )

    // render the original component, but have the
    // reaction track the observables, so that rendering
    // can be invalidated (see above) once a dependency changes
    let renderResult!: T
    let exception
    adm.reaction!.track(() => {
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

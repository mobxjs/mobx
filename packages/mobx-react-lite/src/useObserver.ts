import { Reaction } from "mobx"
import React, { useLayoutEffect } from "react"
import { printDebugValue } from "./utils/printDebugValue"
import { isUsingStaticRendering } from "./staticRendering"
import { useSyncExternalStore } from "use-sync-external-store/shim"

// Required by SSR when hydrating #3669
const getServerSnapshot = () => {}

// Do not store `admRef` (even as part of a closure!) on this object,
// otherwise it will prevent GC and therefore reaction disposal via FinalizationRegistry.
type ObserverAdministration = {
    reaction: Reaction | null // also serves as disposed flag
    onStoreChange: Function | null // also serves as mounted flag
    // BC: we will use local state version if global isn't available.
    // It should behave as previous implementation - tearing is still present,
    // because there is no cross component synchronization,
    // but we can use `useSyncExternalStore` API.
    stateVersion: any
    name: string
    // These don't depend on state/props, therefore we can keep them here instead of `useCallback`
    subscribe: Parameters<typeof React.useSyncExternalStore>[0]
    getSnapshot: Parameters<typeof React.useSyncExternalStore>[1]
}

function createReaction(adm: ObserverAdministration) {
    adm.reaction = new Reaction(`observer${adm.name}`, () => {
        adm.stateVersion = Symbol()
        // onStoreChange won't be available until the component "mounts".
        // If state changes in between initial render and mount,
        // `useSyncExternalStore` should handle that by checking the state version and issuing update.
        adm.onStoreChange?.()
    })
}

function disposeReaction(adm: ObserverAdministration) {
    adm.onStoreChange = null
    adm.reaction?.dispose()
    adm.reaction = null
}

export function useObserver<T>(render: () => T, baseComponentName: string = "observed"): T {
    if (isUsingStaticRendering()) {
        return render()
    }

    const animationRequestIDRef = React.useRef<number | null>(null)
    const admRef = React.useRef<ObserverAdministration | null>(null)

    if (!admRef.current) {
        // First render
        const adm: ObserverAdministration = {
            reaction: null,
            onStoreChange: null,
            stateVersion: Symbol(),
            name: baseComponentName,
            subscribe(onStoreChange: () => void) {
                // Do NOT access admRef here!
                adm.onStoreChange = onStoreChange
                if (!adm.reaction) {
                    // We've lost our reaction and therefore all subscriptions, occurs when:
                    // 1. Timer based finalization registry disposed reaction before component mounted.
                    // 2. React "re-mounts" same component without calling render in between (typically <StrictMode>).
                    // We have to recreate reaction and schedule re-render to recreate subscriptions,
                    // even if state did not change.
                    createReaction(adm)
                    // `onStoreChange` won't force update if subsequent `getSnapshot` returns same value.
                    // So we make sure that is not the case
                    adm.stateVersion = Symbol()
                }

                return () => {
                    // Do NOT access admRef here!
                    disposeReaction(adm)
                }
            },
            getSnapshot() {
                // Do NOT access admRef here!
                return adm.stateVersion
            }
        }

        admRef.current = adm
    }

    const adm = admRef.current!
    const firstRender = !adm.reaction

    if (firstRender) {
        // First render or reaction was disposed by registry before subscribe
        createReaction(adm)
    }

    React.useDebugValue(adm.reaction!, printDebugValue)

    useSyncExternalStore(
        // Both of these must be stable, otherwise it would keep resubscribing every render.
        adm.subscribe,
        adm.getSnapshot,
        getServerSnapshot
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

    if (animationRequestIDRef.current !== null) {
        // cancel previous animation frame
        cancelAnimationFrame(animationRequestIDRef.current)
        animationRequestIDRef.current = null
    }

    // StrictMode/ConcurrentMode/Suspense may mean that our component is
    // rendered and abandoned multiple times, so we need to dispose leaked
    // Reactions.
    animationRequestIDRef.current = requestAnimationFrame(() => {
        disposeReaction(adm)
    })

    if (exception) {
        throw exception // re-throw any exceptions caught during rendering
    }

    const animationRequestID = animationRequestIDRef.current

    useLayoutEffect(() => {
        cancelAnimationFrame(animationRequestID)
    })

    return renderResult
}

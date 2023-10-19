import { Reaction } from "mobx"
import React from "react"
import { printDebugValue } from "./utils/printDebugValue"
import { isUsingStaticRendering } from "./staticRendering"
import { useSyncExternalStore } from "use-sync-external-store/shim"

// Required by SSR when hydrating #3669
const getServerSnapshot = () => {}

type ObserverAdministration = {
    reaction: Reaction | null // also serves as disposed flag
    onStoreChange: Function | null // also serves as mounted flag
    // BC: we will use local state version if global isn't available.
    // It should behave as previous implementation - tearing is still present,
    // because there is no cross component synchronization,
    // but we can use `useSyncExternalStore` API.
    stateVersion: any
    // These don't depend on state/props, therefore we can keep them here instead of `useCallback`
    subscribe: Parameters<typeof React.useSyncExternalStore>[0]
    getSnapshot: Parameters<typeof React.useSyncExternalStore>[1]
}

function createReaction(name: string, adm: ObserverAdministration): Reaction {
    return new Reaction(`observer${name}`, () => forceUpdate(adm))
}

function disposeReaction(adm: ObserverAdministration) {
    adm.reaction?.dispose()
    adm.reaction = null
}

function forceUpdate(adm: ObserverAdministration) {
    adm.stateVersion = Symbol()
    // onStoreChange won't be available until the component "mounts".
    // If state changes in between initial render and mount,
    // `useSyncExternalStore` should handle that by checking the state version and issuing update.
    adm.onStoreChange?.()
}

function useReactionDisposer(adm: ObserverAdministration) {
    const animationRequestIDRef = React.useRef<number | null>(null)

    if (animationRequestIDRef.current !== null) {
        // cancel previous animation frame
        cancelAnimationFrame(animationRequestIDRef.current)
        animationRequestIDRef.current = null
    }

    animationRequestIDRef.current = requestAnimationFrame(() => {
        // 1. StrictMode/ConcurrentMode/Suspense may mean that our component is
        //    rendered and abandoned multiple times, so we need to dispose leaked
        //    Reactions.
        // 2. The component haven't been rendered in the following animation frame.
        disposeReaction(adm!)
        animationRequestIDRef.current = null
    })

    React.useLayoutEffect(() => {
        if (animationRequestIDRef.current !== null) {
            // Component mounted, we don't need to dispose reaction anymore
            cancelAnimationFrame(animationRequestIDRef.current)
            animationRequestIDRef.current = null
        }

        // In some rare cases reaction will be disposed before component mounted,
        // but we still need to recreate it.
        if (adm && !adm.reaction) {
            forceUpdate(adm)
        }
    })
}

function createObserverAdministration(): ObserverAdministration {
    const adm: ObserverAdministration = {
        reaction: null,
        onStoreChange: null,
        stateVersion: Symbol(),
        subscribe(onStoreChange: () => void) {
            this.onStoreChange = onStoreChange
            if (!this.reaction) {
                // We've lost our reaction and therefore all subscriptions, occurs when:
                // 1. requestAnimationFrame disposed reaction before component mounted.
                // 2. React "re-mounts" same component without calling render in between (typically <StrictMode>).
                // We have to schedule re-render to recreate reaction and subscriptions, even if state did not change.
                forceUpdate(this)
            }

            return () => {
                this.onStoreChange = null
                disposeReaction(this)
            }
        },
        getSnapshot() {
            return this.stateVersion
        }
    }

    adm.subscribe = adm.subscribe.bind(adm)
    adm.getSnapshot = adm.getSnapshot.bind(adm)

    return adm
}

export function useObserver<T>(render: () => T, baseComponentName: string = "observed"): T {
    if (isUsingStaticRendering()) {
        return render()
    }

    const admRef = React.useRef<ObserverAdministration | null>(null)
    let adm = admRef.current

    if (!adm) {
        // First render
        adm = admRef.current = createObserverAdministration()
    }

    if (!adm.reaction) {
        // First render or reaction was disposed before subscribe
        adm.reaction = createReaction(baseComponentName, adm)
    }

    React.useDebugValue(adm.reaction, printDebugValue)

    useReactionDisposer(adm)

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
    adm.reaction.track(() => {
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

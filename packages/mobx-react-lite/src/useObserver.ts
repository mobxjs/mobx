import { Reaction } from "mobx"
import React from "react"
import { printDebugValue } from "./utils/printDebugValue"
import { isUsingStaticRendering } from "./staticRendering"
import { useSyncExternalStore } from "use-sync-external-store/shim"

// Required by SSR when hydrating #3669
const getServerSnapshot = () => {}

// will prevent disposing reaction of delayed components
const DISPOSE_TIMEOUT = 100

type ObserverAdministration = {
    subscribe(onStoreChange: VoidFunction): VoidFunction
    readonly reaction: Reaction
    isLive(): boolean
    getSnapshot(): symbol
}

type TimeoutId = Parameters<typeof clearTimeout>[0]

const createObserverAdministration = (name: string): ObserverAdministration => {
    let onStoreChange: VoidFunction | undefined = undefined
    let stateVersion = Symbol()
    let timeoutID: TimeoutId
    let reaction: Reaction | undefined = new Reaction(`observer${name}`, () => {
        stateVersion = Symbol()
        // onStoreChange won't be available until the component "mounts".
        // If state changes in between initial render and mount,
        // `useSyncExternalStore` should handle that by checking the state version and issuing update.
        onStoreChange?.()
    })
    const cancelDispose = () => {
        clearTimeout(timeoutID)
        timeoutID = undefined
    }
    const dispose = () => {
        // We've lost our reaction and therefore all subscriptions, occurs when:
        // 1. scheduleDispose disposed reaction before component mounted.
        // 2. React "re-mounts" same component without calling render in between (typically <StrictMode>).
        // 3. component was unmounted.
        // We have to schedule re-render to recreate reaction and subscriptions, even if state did not change.
        // This will have no effect if component is not mounted.
        stateVersion = Symbol()

        reaction?.dispose()
        reaction = undefined
        onStoreChange = undefined
        cancelDispose()
    }

    timeoutID = setTimeout(dispose, DISPOSE_TIMEOUT)

    return {
        get reaction() {
            if (!reaction) {
                throw new Error("reaction has been disposed")
            }

            return reaction
        },
        getSnapshot: () => stateVersion,
        isLive: () => !!reaction,
        subscribe: (cb: () => void) => {
            cancelDispose()
            onStoreChange = cb

            return () => {
                onStoreChange = undefined
                dispose()
            }
        }
    }
}

export function useObserver<T>(render: () => T, baseComponentName: string = "observed"): T {
    if (isUsingStaticRendering()) {
        return render()
    }

    const admRef = React.useRef<ObserverAdministration | null>(null)

    if (!admRef.current || !admRef.current.isLive()) {
        // First render or reaction was disposed
        admRef.current = createObserverAdministration(baseComponentName)
    }

    const { reaction, subscribe, getSnapshot } = admRef.current

    React.useDebugValue(reaction, printDebugValue)

    useSyncExternalStore(
        // Both of these must be stable, otherwise it would keep resubscribing every render.
        subscribe,
        getSnapshot,
        getServerSnapshot
    )

    // render the original component, but have the
    // reaction track the observables, so that rendering
    // can be invalidated (see above) once a dependency changes
    let renderResult!: T
    let exception: unknown

    reaction.track(() => {
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

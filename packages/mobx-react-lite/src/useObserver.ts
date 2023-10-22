import { Reaction } from "mobx"
import React from "react"
import { printDebugValue } from "./utils/printDebugValue"
import { isUsingStaticRendering } from "./staticRendering"
import { useSyncExternalStore } from "use-sync-external-store/shim"

// Required by SSR when hydrating #3669
const getServerSnapshot = () => {}

// will prevent disposing reaction of delayed components
const DISPOSE_TIMEOUT = 100

class ObserverAdministration {
    reaction: Reaction | null // also serves as disposed flag
    onStoreChange: Function | null // also serves as mounted flag
    timeoutID: number | null
    // BC: we will use local state version if global isn't available.
    // It should behave as previous implementation - tearing is still present,
    // because there is no cross component synchronization,
    // but we can use `useSyncExternalStore` API.
    stateVersion: any

    constructor(name: string) {
        this.forceUpdate = this.forceUpdate.bind(this)
        this.subscribe = this.subscribe.bind(this)
        this.getSnapshot = this.getSnapshot.bind(this)
        this.dispose = this.dispose.bind(this)

        this.reaction = new Reaction(`observer${name}`, this.forceUpdate)
        this.onStoreChange = null
        this.stateVersion = Symbol()
        this.timeoutID = null

        this.scheduleDispose()
    }

    subscribe(onStoreChange: () => void) {
        this.cancelDispose()
        this.onStoreChange = onStoreChange

        return () => {
            this.onStoreChange = null
            this.dispose()
        }
    }

    getSnapshot() {
        return this.stateVersion
    }

    private forceUpdate() {
        this.stateVersion = Symbol()
        // onStoreChange won't be available until the component "mounts".
        // If state changes in between initial render and mount,
        // `useSyncExternalStore` should handle that by checking the state version and issuing update.
        this.onStoreChange?.()
    }

    private dispose() {
        // We've lost our reaction and therefore all subscriptions, occurs when:
        // 1. scheduleDispose disposed reaction before component mounted.
        // 2. React "re-mounts" same component without calling render in between (typically <StrictMode>).
        // 3. component was unmounted.
        // We have to schedule re-render to recreate reaction and subscriptions, even if state did not change.
        // This will have no effect if component is not mounted.
        this.stateVersion = Symbol()

        this.reaction?.dispose()
        this.reaction = null
        this.onStoreChange = null
        this.cancelDispose()
    }

    private scheduleDispose() {
        this.timeoutID = setTimeout(this.dispose, DISPOSE_TIMEOUT) as unknown as number
    }

    private cancelDispose() {
        if (this.timeoutID !== null) {
            clearTimeout(this.timeoutID)
            this.timeoutID = null
        }
    }
}

export function useObserver<T>(render: () => T, baseComponentName: string = "observed"): T {
    if (isUsingStaticRendering()) {
        return render()
    }

    const admRef = React.useRef<ObserverAdministration | null>(null)
    let adm = admRef.current

    if (!adm?.reaction) {
        // First render or reaction was disposed
        adm = admRef.current = new ObserverAdministration(baseComponentName)
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

    if (exception) {
        throw exception // re-throw any exceptions caught during rendering
    }

    return renderResult
}

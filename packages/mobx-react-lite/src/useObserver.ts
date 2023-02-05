import { Reaction } from "mobx"
import React from "react"
import { printDebugValue } from "./utils/printDebugValue"
import { observerFinalizationRegistry } from "./utils/observerFinalizationRegistry"
import { isUsingStaticRendering } from "./staticRendering"

function observerComponentNameFor(baseComponentName: string) {
    return `observer${baseComponentName}`
}

type ObserverAdministration = {
    /** The Reaction created during first render, which may be leaked */
    reaction: Reaction | null

    /**
     * Whether the component has yet completed mounting (for us, whether
     * its useEffect has run)
     */
    mounted: boolean

    /**
     * Whether the observables that the component is tracking changed between
     * the first render and the first useEffect.
     */
    changedBeforeMount: boolean
}

/**
 * We use class to make it easier to detect in heap snapshots by name
 */
class ObjectToBeRetainedByReact {}

function objectToBeRetainedByReactFactory() {
    return new ObjectToBeRetainedByReact()
}

export function useObserver<T>(fn: () => T, baseComponentName: string = "observed"): T {
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
    const admRef = React.useRef<ObserverAdministration | null>(null)

    if (!admRef.current) {
        // First render
        admRef.current = {
            reaction: null,
            mounted: false,
            changedBeforeMount: false
        }
    }

    const adm = admRef.current!

    if (!adm.reaction) {
        // First render or component was not committed and reaction was disposed by registry
        adm.reaction = new Reaction(observerComponentNameFor(baseComponentName), () => {
            // Observable has changed, meaning we want to re-render
            // BUT if we're a component that hasn't yet got to the useEffect()
            // stage, we might be a component that _started_ to render, but
            // got dropped, and we don't want to make state changes then.
            // (It triggers warnings in StrictMode, for a start.)
            if (adm.mounted) {
                // We have reached useEffect(), so we're mounted, and can trigger an update
                forceUpdate()
            } else {
                // We haven't yet reached useEffect(), so we'll need to trigger a re-render
                // when (and if) useEffect() arrives.
                adm.changedBeforeMount = true
            }
        })

        observerFinalizationRegistry.register(objectRetainedByReact, adm, adm)
    }

    React.useDebugValue(adm.reaction, printDebugValue)

    React.useEffect(() => {
        observerFinalizationRegistry.unregister(adm)

        adm.mounted = true

        if (adm.reaction) {
            if (adm.changedBeforeMount) {
                // Got a change before mount, force an update
                adm.changedBeforeMount = false
                forceUpdate()
            }
        } else {
            // The reaction we set up in our render has been disposed.
            // This can be due to bad timings of renderings, e.g. our
            // component was paused for a _very_ long time, and our
            // reaction got cleaned up

            // Re-create the reaction
            adm.reaction = new Reaction(observerComponentNameFor(baseComponentName), () => {
                // We've definitely already been mounted at this point
                forceUpdate()
            })
            forceUpdate()
        }

        return () => {
            adm.reaction!.dispose()
            adm.reaction = null
            adm.mounted = false
            adm.changedBeforeMount = false
        }
    }, [])

    // render the original component, but have the
    // reaction track the observables, so that rendering
    // can be invalidated (see above) once a dependency changes
    let rendering!: T
    let exception
    adm.reaction.track(() => {
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

import { ScheduledReaction, ReactionScheduler } from "mobx"
import React from "react"
import { printDebugValue } from "./utils/printDebugValue"
import { isUsingStaticRendering } from "./staticRendering"
import { observerFinalizationRegistry } from "./utils/observerFinalizationRegistry"
import { useSyncExternalStore } from "use-sync-external-store/shim"

export type ScheduledObserverOptions = {
    onStale?: () => void // fires when scheduler is invoked (stale begins)
    onFresh?: () => void // fires when onInvalidate_ runs (stale ends)
}

// Do not store `admRef` (even as part of a closure!) on this object,
// otherwise it will prevent GC and therefore reaction disposal via FinalizationRegistry.
type ScheduledObserverAdministration = {
    reaction: ScheduledReaction | null // also serves as disposed flag
    onStoreChange: Function | null // also serves as mounted flag
    // stateVersion that 'ticks' for every time the reaction fires
    // tearing is still present,
    // because there is no cross component synchronization,
    // but we can use `useSyncExternalStore` API.
    stateVersion: any
    name: string
    scheduler: ReactionScheduler
    onStale: (() => void) | null
    onFresh: (() => void) | null
    // These don't depend on state/props, therefore we can keep them here instead of `useCallback`
    subscribe: Parameters<typeof React.useSyncExternalStore>[0]
    getSnapshot: Parameters<typeof React.useSyncExternalStore>[1]
}

function createScheduledReaction(adm: ScheduledObserverAdministration) {
    adm.reaction = new ScheduledReaction(
        `scheduledObserver${adm.name}`,
        () => {
            adm.onFresh?.()
            adm.stateVersion = Symbol()
            // onStoreChange won't be available until the component "mounts".
            // If state changes in between initial render and mount,
            // `useSyncExternalStore` should handle that by checking the state version and issuing update.
            adm.onStoreChange?.()
        },
        reaction => {
            adm.onStale?.()
            adm.scheduler(reaction)
        }
    )
}

/**
 * A React hook that creates a scheduled observer using ScheduledReaction.
 * Unlike `useObserver`, this defers reaction execution to the provided scheduler,
 * allowing expensive computed recalculations to happen outside the critical rendering path.
 *
 * @param render - The render function that accesses MobX observables
 * @param scheduler - A ReactionScheduler that controls when the reaction runs
 * @param baseComponentName - Optional component name for debugging
 *
 * @example
 * ```tsx
 * // Create a scheduler that defers to next frame
 * const rafScheduler = createRAFScheduler()
 *
 * function MyComponent() {
 *   return useScheduledObserver(() => (
 *     <div>{store.expensiveComputedValue}</div>
 *   ), rafScheduler)
 * }
 * ```
 */
export function useScheduledObserver<T>(
    render: () => T,
    scheduler: ReactionScheduler,
    baseComponentName: string = "observed",
    options?: ScheduledObserverOptions
): T {
    if (isUsingStaticRendering()) {
        return render()
    }

    const admRef = React.useRef<ScheduledObserverAdministration | null>(null)

    if (!admRef.current) {
        // First render
        const adm: ScheduledObserverAdministration = {
            reaction: null,
            onStoreChange: null,
            stateVersion: Symbol(),
            name: baseComponentName,
            scheduler,
            onStale: options?.onStale ?? null,
            onFresh: options?.onFresh ?? null,
            subscribe(onStoreChange: () => void) {
                // Do NOT access admRef here!
                observerFinalizationRegistry.unregister(adm)
                adm.onStoreChange = onStoreChange
                if (!adm.reaction) {
                    // We've lost our reaction and therefore all subscriptions, occurs when:
                    // 1. Timer based finalization registry disposed reaction before component mounted.
                    // 2. React "re-mounts" same component without calling render in between (typically <StrictMode>).
                    // We have to recreate reaction and schedule re-render to recreate subscriptions,
                    // even if state did not change.
                    createScheduledReaction(adm)
                    // `onStoreChange` won't force update if subsequent `getSnapshot` returns same value.
                    // So we make sure that is not the case
                    adm.stateVersion = Symbol()
                }

                return () => {
                    // Do NOT access admRef here!
                    adm.onStoreChange = null
                    adm.reaction?.dispose()
                    adm.reaction = null
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

    // Update scheduler and callbacks if they changed (though typically they shouldn't)
    adm.scheduler = scheduler
    adm.onStale = options?.onStale ?? null
    adm.onFresh = options?.onFresh ?? null

    if (!adm.reaction) {
        // First render or reaction was disposed by registry before subscribe
        createScheduledReaction(adm)
        // StrictMode/ConcurrentMode/Suspense may mean that our component is
        // rendered and abandoned multiple times, so we need to track leaked
        // Reactions.
        observerFinalizationRegistry.register(admRef, adm, adm)
    }

    React.useDebugValue(adm.reaction!, printDebugValue)

    useSyncExternalStore(
        // Both of these must be stable, otherwise it would keep resubscribing every render.
        adm.subscribe,
        adm.getSnapshot,
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

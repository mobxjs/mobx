import { Reaction } from "mobx"

export function createTrackingData(reaction: Reaction) {
    const trackingData: IReactionTracking = {
        reaction,
        mounted: false,
        changedBeforeMount: false,
        cleanAt: Date.now() + CLEANUP_LEAKED_REACTIONS_AFTER_MILLIS
    }
    return trackingData
}

/**
 * Unified api for timers/Finalization registry cleanups
 * This abstraction make useObserver much simpler
 */
export interface ReactionCleanupTracking {
    /**
     *
     * @param reaction The reaction to cleanup
     * @param objectRetainedByReact This will be in actual use only when FinalizationRegister is in use
     */
    addReactionToTrack(
        reactionTrackingRef: React.MutableRefObject<IReactionTracking | null>,
        reaction: Reaction,
        objectRetainedByReact: object
    ): IReactionTracking
    recordReactionAsCommitted(reactionRef: React.MutableRefObject<IReactionTracking | null>): void
    forceCleanupTimerToRunNowForTests(): void
    resetCleanupScheduleForTests(): void
}

export interface IReactionTracking {
    /** The Reaction created during first render, which may be leaked */
    reaction: Reaction
    /**
     * The time (in ticks) at which point we should dispose of the reaction
     * if this component hasn't yet been fully mounted.
     */
    cleanAt: number

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

    /**
     * In case we are using finalization registry based cleanup,
     * this will hold the cleanup token associated with this reaction
     */
    finalizationRegistryCleanupToken?: number
}

/**
 * The minimum time before we'll clean up a Reaction created in a render
 * for a component that hasn't managed to run its effects. This needs to
 * be big enough to ensure that a component won't turn up and have its
 * effects run without being re-rendered.
 */
export const CLEANUP_LEAKED_REACTIONS_AFTER_MILLIS = 10_000

/**
 * The frequency with which we'll check for leaked reactions.
 */
export const CLEANUP_TIMER_LOOP_MILLIS = 10_000

import { Reaction } from "mobx"
import {
    ReactionCleanupTracking,
    IReactionTracking,
    CLEANUP_TIMER_LOOP_MILLIS,
    createTrackingData
} from "./reactionCleanupTrackingCommon"

/**
 * timers, gc-style, uncommitted reaction cleanup
 */
export function createTimerBasedReactionCleanupTracking(): ReactionCleanupTracking {
    /**
     * Reactions created by components that have yet to be fully mounted.
     */
    const uncommittedReactionRefs: Set<React.MutableRefObject<IReactionTracking | null>> = new Set()

    /**
     * Latest 'uncommitted reactions' cleanup timer handle.
     */
    let reactionCleanupHandle: ReturnType<typeof setTimeout> | undefined

    /* istanbul ignore next */
    /**
     * Only to be used by test functions; do not export outside of mobx-react-lite
     */
    function forceCleanupTimerToRunNowForTests() {
        // This allows us to control the execution of the cleanup timer
        // to force it to run at awkward times in unit tests.
        if (reactionCleanupHandle) {
            clearTimeout(reactionCleanupHandle)
            cleanUncommittedReactions()
        }
    }

    /* istanbul ignore next */
    function resetCleanupScheduleForTests() {
        if (uncommittedReactionRefs.size > 0) {
            for (const ref of uncommittedReactionRefs) {
                const tracking = ref.current
                if (tracking) {
                    tracking.reaction.dispose()
                    ref.current = null
                }
            }
            uncommittedReactionRefs.clear()
        }

        if (reactionCleanupHandle) {
            clearTimeout(reactionCleanupHandle)
            reactionCleanupHandle = undefined
        }
    }

    function ensureCleanupTimerRunning() {
        if (reactionCleanupHandle === undefined) {
            reactionCleanupHandle = setTimeout(cleanUncommittedReactions, CLEANUP_TIMER_LOOP_MILLIS)
        }
    }

    function scheduleCleanupOfReactionIfLeaked(
        ref: React.MutableRefObject<IReactionTracking | null>
    ) {
        uncommittedReactionRefs.add(ref)

        ensureCleanupTimerRunning()
    }

    function recordReactionAsCommitted(
        reactionRef: React.MutableRefObject<IReactionTracking | null>
    ) {
        uncommittedReactionRefs.delete(reactionRef)
    }

    /**
     * Run by the cleanup timer to dispose any outstanding reactions
     */
    function cleanUncommittedReactions() {
        reactionCleanupHandle = undefined

        // Loop through all the candidate leaked reactions; those older
        // than CLEANUP_LEAKED_REACTIONS_AFTER_MILLIS get tidied.

        const now = Date.now()
        uncommittedReactionRefs.forEach(ref => {
            const tracking = ref.current
            if (tracking) {
                if (now >= tracking.cleanAt) {
                    // It's time to tidy up this leaked reaction.
                    tracking.reaction.dispose()
                    ref.current = null
                    uncommittedReactionRefs.delete(ref)
                }
            }
        })

        if (uncommittedReactionRefs.size > 0) {
            // We've just finished a round of cleanups but there are still
            // some leak candidates outstanding.
            ensureCleanupTimerRunning()
        }
    }

    return {
        addReactionToTrack(
            reactionTrackingRef: React.MutableRefObject<IReactionTracking | null>,
            reaction: Reaction,
            /**
             * On timer based implementation we don't really need this object,
             * but we keep the same api
             */
            objectRetainedByReact: unknown
        ) {
            reactionTrackingRef.current = createTrackingData(reaction)
            scheduleCleanupOfReactionIfLeaked(reactionTrackingRef)
            return reactionTrackingRef.current
        },
        recordReactionAsCommitted,
        forceCleanupTimerToRunNowForTests,
        resetCleanupScheduleForTests
    }
}

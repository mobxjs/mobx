import { FinalizationRegistry as FinalizationRegistryMaybeUndefined } from "./FinalizationRegistryWrapper"
import { Reaction } from "mobx"
import {
    ReactionCleanupTracking,
    IReactionTracking,
    createTrackingData
} from "./reactionCleanupTrackingCommon"

/**
 * FinalizationRegistry-based uncommitted reaction cleanup
 */
export function createReactionCleanupTrackingUsingFinalizationRegister(
    FinalizationRegistry: NonNullable<typeof FinalizationRegistryMaybeUndefined>
): ReactionCleanupTracking {
    const cleanupTokenToReactionTrackingMap = new Map<number, IReactionTracking>()
    let globalCleanupTokensCounter = 1

    const registry = new FinalizationRegistry(function cleanupFunction(token: number) {
        const trackedReaction = cleanupTokenToReactionTrackingMap.get(token)
        if (trackedReaction) {
            trackedReaction.reaction.dispose()
            cleanupTokenToReactionTrackingMap.delete(token)
        }
    })

    return {
        addReactionToTrack(
            reactionTrackingRef: React.MutableRefObject<IReactionTracking | null>,
            reaction: Reaction,
            objectRetainedByReact: object
        ) {
            const token = globalCleanupTokensCounter++

            registry.register(objectRetainedByReact, token, reactionTrackingRef)
            reactionTrackingRef.current = createTrackingData(reaction)
            reactionTrackingRef.current.finalizationRegistryCleanupToken = token
            cleanupTokenToReactionTrackingMap.set(token, reactionTrackingRef.current)

            return reactionTrackingRef.current
        },
        recordReactionAsCommitted(reactionRef: React.MutableRefObject<IReactionTracking | null>) {
            registry.unregister(reactionRef)

            if (reactionRef.current && reactionRef.current.finalizationRegistryCleanupToken) {
                cleanupTokenToReactionTrackingMap.delete(
                    reactionRef.current.finalizationRegistryCleanupToken
                )
            }
        },
        forceCleanupTimerToRunNowForTests() {
            // When FinalizationRegistry in use, this this is no-op
        },
        resetCleanupScheduleForTests() {
            // When FinalizationRegistry in use, this this is no-op
        }
    }
}

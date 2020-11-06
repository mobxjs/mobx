import { FinalizationRegistry as FinalizationRegistryMaybeUndefined } from "./FinalizationRegistryWrapper"
import { createReactionCleanupTrackingUsingFinalizationRegister } from "./createReactionCleanupTrackingUsingFinalizationRegister"
import { createTimerBasedReactionCleanupTracking } from "./createTimerBasedReactionCleanupTracking"
export { IReactionTracking } from "./reactionCleanupTrackingCommon"

const {
    addReactionToTrack,
    recordReactionAsCommitted,
    resetCleanupScheduleForTests,
    forceCleanupTimerToRunNowForTests
} = FinalizationRegistryMaybeUndefined
    ? createReactionCleanupTrackingUsingFinalizationRegister(FinalizationRegistryMaybeUndefined)
    : createTimerBasedReactionCleanupTracking()

export {
    addReactionToTrack,
    recordReactionAsCommitted,
    resetCleanupScheduleForTests,
    forceCleanupTimerToRunNowForTests
}

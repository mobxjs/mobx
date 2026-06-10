import "./utils/assertEnvironment"

import { configure, observable } from "mobx"
import { Component } from "react"

import { unstable_batchedUpdates as batch } from "./utils/reactBatchedUpdates"
import { observerFinalizationRegistry } from "./utils/observerFinalizationRegistry"

if (batch) {
    configure({ reactionScheduler: batch })
}

if (!Component) {
    throw new Error("mobx-react requires React to be available")
}

if (!observable) {
    throw new Error("mobx-react requires mobx to be available")
}

export { Observer } from "./ObserverComponent"
export { isUsingStaticRendering, enableStaticRendering } from "./staticRendering"
export { useLocalObservable } from "./useLocalObservable"

export { observer } from "./observer"

export { observerFinalizationRegistry as _observerFinalizationRegistry }
export const clearTimers = observerFinalizationRegistry["finalizeAllImmediately"] ?? (() => {})

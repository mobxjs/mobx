import "./utils/assertEnvironment"

import { observable } from "mobx"
import { Component } from "react"

import { observerFinalizationRegistry } from "./utils/observerFinalizationRegistry"

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

import "./utils/assertEnvironment"

import { observerFinalizationRegistry } from "./utils/observerFinalizationRegistry"

export { isUsingStaticRendering, enableStaticRendering } from "./staticRendering"
export { observer } from "./observer"
export { Observer } from "./ObserverComponent"
export { useLocalObservable } from "./useLocalObservable"

export { observerFinalizationRegistry as _observerFinalizationRegistry }
export const clearTimers = observerFinalizationRegistry["finalizeAllImmediately"] ?? (() => {})

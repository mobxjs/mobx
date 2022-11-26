import { ObserverInstance } from "../observer"
import { UniversalFinalizationRegistry } from "./UniversalFinalizationRegistry"

export const observerFinalizationRegistry = new UniversalFinalizationRegistry(
    (instance: ObserverInstance) => {
        instance.reaction?.dispose()
        instance.reaction = null
    }
)

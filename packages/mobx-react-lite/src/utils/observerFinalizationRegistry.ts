import { ObserverInstance } from "../observer"
import {
    UniversalFinalizationRegistry,
    // @ts-ignore
    FinalizationRegistryType
} from "./UniversalFinalizationRegistry"

export const observerFinalizationRegistry = new UniversalFinalizationRegistry(
    (instance: ObserverInstance) => {
        //console.log('FINALIZING'); // TODO
        instance.reaction?.dispose()
        instance.reaction = null
    }
)

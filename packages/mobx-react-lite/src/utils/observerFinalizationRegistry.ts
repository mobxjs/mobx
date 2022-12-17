import { Reaction } from "mobx"
import {
    UniversalFinalizationRegistry,
    // @ts-ignore
    FinalizationRegistryType
} from "./UniversalFinalizationRegistry"

export const observerFinalizationRegistry = new UniversalFinalizationRegistry(
    (adm: { reaction: Reaction | null }) => {
        //console.log('FINALIZING'); // TODO
        adm.reaction?.dispose()
        adm.reaction = null
    }
)

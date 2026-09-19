import { Reaction } from "mobx"
import { UniversalFinalizationRegistry } from "./UniversalFinalizationRegistry"

export const observerFinalizationRegistry = new UniversalFinalizationRegistry(
    (adm: { reaction: Reaction | null }) => {
        const reaction = adm.reaction
        adm.reaction = null
        reaction?.dispose()
    }
)

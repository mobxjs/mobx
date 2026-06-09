import { configure } from "mobx"

export function observerBatching(reactionScheduler: (callback: () => void) => void) {
    configure({ reactionScheduler })
}

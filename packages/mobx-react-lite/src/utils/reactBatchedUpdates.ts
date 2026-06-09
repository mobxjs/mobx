import { defaultNoopBatch } from "./observerBatching"

declare const require:
    | ((moduleName: string) => { unstable_batchedUpdates?: typeof defaultNoopBatch })
    | undefined

export let unstable_batchedUpdates = defaultNoopBatch

if (typeof require === "function") {
    try {
        const reactDom = require("react-dom")
        if (reactDom.unstable_batchedUpdates) {
            unstable_batchedUpdates = reactDom.unstable_batchedUpdates
        }
    } catch {
        // react-dom is optional. React 18+ batches updates automatically, so fall back to no-op
        // batching when react-dom isn't available (for example in React Native or server-only installs).
    }
}

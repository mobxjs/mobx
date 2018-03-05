import { Lambda } from "../utils/utils"
import { IReactionDisposer } from "../core/reaction"
import { untrackedStart, untrackedEnd } from "../core/derivation"
import { autorun } from "./autorun"

export interface IWhenOptions {
    name?: string
    timeout?: number
    onError?: (error: any) => void
}

export function when(
    predicate: () => boolean,
    effect: Lambda,
    opts?: IWhenOptions
): IReactionDisposer {
    let timeoutHandle: any
    if (opts && typeof opts.timeout === "number") {
        timeoutHandle = setTimeout(() => {
            if (!disposer.$mobx.isDisposed) {
                disposer()
                const error = new Error("WHEN_TIMEOUT")
                if (opts && opts.onError) opts.onError(error)
                else throw error
            }
        }, opts.timeout)
    }

    const disposer = autorun(r => {
        if (predicate()) {
            r.dispose()
            if (timeoutHandle) clearTimeout(timeoutHandle)
            const prevUntracked = untrackedStart()
            try {
                effect()
            } finally {
                untrackedEnd(prevUntracked)
            }
        }
    }, opts)
    return disposer
}

import { Lambda, fail } from "../utils/utils"
import { IReactionDisposer } from "../core/reaction"
import { untrackedStart, untrackedEnd } from "../core/derivation"
import { autorun } from "./autorun"

export interface IWhenOptions {
    name?: string
    timeout?: number
    onError?: (error: any) => void
}

export function when(predicate: () => boolean, opts?: IWhenOptions): Promise<void> & { cancel() }
export function when(
    predicate: () => boolean,
    effect: Lambda,
    opts?: IWhenOptions
): IReactionDisposer
export function when(predicate: any, arg1?: any, arg2?: any): any {
    if (arguments.length === 1 || (arg1 && typeof arg1 === "object"))
        return whenPromise(predicate, arg1)
    return _when(predicate, arg1, arg2)
}

function _when(predicate: () => boolean, effect: Lambda, opts?: IWhenOptions): IReactionDisposer {
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

function whenPromise(
    predicate: () => boolean,
    opts?: IWhenOptions
): Promise<void> & { cancel(): void } {
    if (process.env.NODE_ENV !== "production" && opts && opts.onError)
        return fail(`the options 'onError' and 'promise' cannot be combined`)
    let cancel
    const res = new Promise((resolve, reject) => {
        let disposer = _when(predicate, resolve, { ...opts, onError: reject })
        cancel = () => {
            disposer()
            reject("WHEN_CANCELLED")
        }
    })
    ;(res as any).cancel = cancel
    return res as any
}

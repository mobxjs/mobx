import { action } from "./action"
import { fail, noop } from "../utils/utils"

let generatorId = 0

export type CancellablePromise<T> = Promise<T> & { cancel(): void }

export function flow<R>(generator: () => IterableIterator<any>): () => CancellablePromise<R>
export function flow<A1>(
    generator: (a1: A1) => IterableIterator<any>
): (a1: A1) => CancellablePromise<any> // Ideally we want to have R instead of Any, but cannot specify R without specifying A1 etc... 'any' as result is better then not specifying request args
export function flow<A1, A2, A3, A4, A5, A6, A7, A8>(
    generator: (
        a1: A1,
        a2: A2,
        a3: A3,
        a4: A4,
        a5: A5,
        a6: A6,
        a7: A7,
        a8: A8
    ) => IterableIterator<any>
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7, a8: A8) => CancellablePromise<any>
export function flow<A1, A2, A3, A4, A5, A6, A7>(
    generator: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7) => IterableIterator<any>
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7) => CancellablePromise<any>
export function flow<A1, A2, A3, A4, A5, A6>(
    generator: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6) => IterableIterator<any>
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6) => CancellablePromise<any>
export function flow<A1, A2, A3, A4, A5>(
    generator: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => IterableIterator<any>
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => CancellablePromise<any>
export function flow<A1, A2, A3, A4>(
    generator: (a1: A1, a2: A2, a3: A3, a4: A4) => IterableIterator<any>
): (a1: A1, a2: A2, a3: A3, a4: A4) => CancellablePromise<any>
export function flow<A1, A2, A3>(
    generator: (a1: A1, a2: A2, a3: A3) => IterableIterator<any>
): (a1: A1, a2: A2, a3: A3) => CancellablePromise<any>
export function flow<A1, A2>(
    generator: (a1: A1, a2: A2) => IterableIterator<any>
): (a1: A1, a2: A2) => CancellablePromise<any>
export function flow<A1>(
    generator: (a1: A1) => IterableIterator<any>
): (a1: A1) => CancellablePromise<any>
export function flow(generator: Function) {
    if (arguments.length !== 1)
        fail(process.env.NODE_ENV && `Flow expects one 1 argument and cannot be used as decorator`)
    const name = generator.name || "<unnamed flow>"

    // Implementation based on https://github.com/tj/co/blob/master/index.js
    return function() {
        const ctx = this
        const args = arguments
        const runId = ++generatorId
        const gen = action(`${name} - runid: ${runId} - init`, generator).apply(ctx, args)
        let rejector: (error: any) => void
        let pendingPromise: CancellablePromise<any> | undefined = undefined

        const res = new Promise(function(resolve, reject) {
            let stepId = 0
            rejector = reject

            function onFulfilled(res: any) {
                pendingPromise = undefined
                let ret
                try {
                    ret = action(`${name} - runid: ${runId} - yield ${stepId++}`, gen.next).call(
                        gen,
                        res
                    )
                } catch (e) {
                    return reject(e)
                }

                next(ret)
            }

            function onRejected(err: any) {
                pendingPromise = undefined
                let ret
                try {
                    ret = action(`${name} - runid: ${runId} - yield ${stepId++}`, gen.throw).call(
                        gen,
                        err
                    )
                } catch (e) {
                    return reject(e)
                }
                next(ret)
            }

            function next(ret: any) {
                if (ret && typeof ret.then === "function") {
                    // an async iterator
                    ret.then(next, reject)
                    return
                }
                if (ret.done) return resolve(ret.value)
                pendingPromise = Promise.resolve(ret.value) as any
                return pendingPromise!.then(onFulfilled, onRejected)
            }

            onFulfilled(undefined) // kick off the process
        }) as any

        res.cancel = action(`${name} - runid: ${runId} - cancel`, function() {
            try {
                if (pendingPromise) cancelPromise(pendingPromise)
                // Finally block can return (or yield) stuff..
                const res = gen.return()
                // eat anything that promise would do, it's cancelled!
                const yieldedPromise = Promise.resolve(res.value)
                yieldedPromise.then(noop, noop)
                cancelPromise(yieldedPromise) // maybe it can be cancelled :)
                // reject our original promise
                rejector(new Error("FLOW_CANCELLED"))
            } catch (e) {
                rejector(e) // there could be a throwing finally block
            }
        })
        return res
    }
}

function cancelPromise(promise) {
    if (typeof promise.cancel === "function") promise.cancel()
}

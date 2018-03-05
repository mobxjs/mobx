import { BabelDescriptor } from "../utils/decorators2"
import { addHiddenFinalProp } from "../utils/utils"
import { action } from "./action"

// method decorator:
export function flow(
    target: Object,
    propertyKey: string,
    descriptor: PropertyDescriptor
): PropertyDescriptor

// non-decorator forms
export function flow<R>(generator: () => IterableIterator<any>): () => Promise<R>
export function flow<A1>(generator: (a1: A1) => IterableIterator<any>): (a1: A1) => Promise<any> // Ideally we want to have R instead of Any, but cannot specify R without specifying A1 etc... 'any' as result is better then not specifying request args
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
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7, a8: A8) => Promise<any>
export function flow<A1, A2, A3, A4, A5, A6, A7>(
    generator: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7) => IterableIterator<any>
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7) => Promise<any>
export function flow<A1, A2, A3, A4, A5, A6>(
    generator: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6) => IterableIterator<any>
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6) => Promise<any>
export function flow<A1, A2, A3, A4, A5>(
    generator: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => IterableIterator<any>
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => Promise<any>
export function flow<A1, A2, A3, A4>(
    generator: (a1: A1, a2: A2, a3: A3, a4: A4) => IterableIterator<any>
): (a1: A1, a2: A2, a3: A3, a4: A4) => Promise<any>
export function flow<A1, A2, A3>(
    generator: (a1: A1, a2: A2, a3: A3) => IterableIterator<any>
): (a1: A1, a2: A2, a3: A3) => Promise<any>
export function flow<A1, A2>(
    generator: (a1: A1, a2: A2) => IterableIterator<any>
): (a1: A1, a2: A2) => Promise<any>
export function flow<A1>(generator: (a1: A1) => IterableIterator<any>): (a1: A1) => Promise<any>
// ... with name
export function flow<R>(name: string, generator: () => IterableIterator<any>): () => Promise<R>
export function flow<A1>(
    name: string,
    generator: (a1: A1) => IterableIterator<any>
): (a1: A1) => Promise<any> // Ideally we want to have R instead of Any, but cannot specify R without specifying A1 etc... 'any' as result is better then not specifying request args
export function flow<A1, A2, A3, A4, A5, A6, A7, A8>(
    name: string,
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
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7, a8: A8) => Promise<any>
export function flow<A1, A2, A3, A4, A5, A6, A7>(
    name: string,
    generator: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7) => IterableIterator<any>
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7) => Promise<any>
export function flow<A1, A2, A3, A4, A5, A6>(
    name: string,
    generator: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6) => IterableIterator<any>
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6) => Promise<any>
export function flow<A1, A2, A3, A4, A5>(
    name: string,
    generator: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => IterableIterator<any>
): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => Promise<any>
export function flow<A1, A2, A3, A4>(
    name: string,
    generator: (a1: A1, a2: A2, a3: A3, a4: A4) => IterableIterator<any>
): (a1: A1, a2: A2, a3: A3, a4: A4) => Promise<any>
export function flow<A1, A2, A3>(
    name: string,
    generator: (a1: A1, a2: A2, a3: A3) => IterableIterator<any>
): (a1: A1, a2: A2, a3: A3) => Promise<any>
export function flow<A1, A2>(
    name: string,
    generator: (a1: A1, a2: A2) => IterableIterator<any>
): (a1: A1, a2: A2) => Promise<any>
export function flow<A1>(
    name: string,
    generator: (a1: A1) => IterableIterator<any>
): (a1: A1) => Promise<any>

/**
 * `asyncAction` takes a generator function and automatically wraps all parts of the process in actions. See the examples below.
 * `asyncAction` can be used both as decorator or to wrap functions.
 *
 * - It is important that `asyncAction should always be used with a generator function (recognizable as `function*` or `*name` syntax)
 * - Each yield statement should return a Promise. The generator function will continue as soon as the promise settles, with the settled value
 * - When the generator function finishes, you can return a normal value. The `asyncAction` wrapped function will always produce a promise delivering that value.
 *
 * When using the mobx devTools, an asyncAction will emit `action` events with names like:
 * * `"fetchUsers - runid: 6 - init"`
 * * `"fetchUsers - runid: 6 - yield 0"`
 * * `"fetchUsers - runid: 6 - yield 1"`
 *
 * The `runId` represents the generator instance. In other words, if `fetchUsers` is invoked multiple times concurrently, the events with the same `runid` belong toghether.
 * The `yield` number indicates the progress of the generator. `init` indicates spawning (it won't do anything, but you can find the original arguments of the `asyncAction` here).
 * `yield 0` ... `yield n` indicates the code block that is now being executed. `yield 0` is before the first `yield`, `yield 1` after the first one etc. Note that yield numbers are not determined lexically but by the runtime flow.
 *
 * `asyncActions` requires `Promise` and `generators` to be available on the target environment. Polyfill `Promise` if needed. Both TypeScript and Babel can compile generator functions down to ES5.
 *
 *  N.B. due to a [babel limitation](https://github.com/loganfsmyth/babel-plugin-transform-decorators-legacy/issues/26), in Babel generatos cannot be combined with decorators. See also [#70](https://github.com/mobxjs/mobx-utils/issues/70)
 *
 * @example
 * import {asyncAction} from "mobx-utils"
 *
 * let users = []
 *
 * const fetchUsers = asyncAction("fetchUsers", function* (url) {
 *   const start = Date.now()
 *   const data = yield window.fetch(url)
 *   users = yield data.json()
 *   return start - Date.now()
 * })
 *
 * fetchUsers("http://users.com").then(time => {
 *   console.dir("Got users", users, "in ", time, "ms")
 * })
 *
 * @example
 * import {asyncAction} from "mobx-utils"
 *
 * mobx.useStrict(true) // don't allow state modifications outside actions
 *
 * class Store {
 * 	\@observable githubProjects = []
 * 	\@state = "pending" // "pending" / "done" / "error"
 *
 * 	\@asyncAction
 * 	*fetchProjects() { // <- note the star, this a generator function!
 * 		this.githubProjects = []
 * 		this.state = "pending"
 * 		try {
 * 			const projects = yield fetchGithubProjectsSomehow() // yield instead of await
 * 			const filteredProjects = somePreprocessing(projects)
 * 			// the asynchronous blocks will automatically be wrapped actions
 * 			this.state = "done"
 * 			this.githubProjects = filteredProjects
 * 		} catch (error) {
 * 			this.state = "error"
 * 		}
 * 	}
 * }
 *
 * @export
 * @returns {Promise}
 */
export function flow(arg1: any, arg2?: any): any {
    // decorator
    if (typeof arguments[1] === "string") return flowDecorator.apply(null, arguments)

    // direct invocation
    const generator = typeof arg1 === "string" ? arg2 : arg1
    const name = typeof arg1 === "string" ? arg1 : generator.name || "<unnamed async action>"
    return createFlowGenerator(name, generator)
}

let generatorId = 0

export function createFlowGenerator(name: string, generator: Function) {
    // Implementation based on https://github.com/tj/co/blob/master/index.js
    return function() {
        const ctx = this
        const args = arguments
        return new Promise(function(resolve, reject) {
            const runId = ++generatorId
            let stepId = 0
            const gen = action(`${name} - runid: ${runId} - init`, generator).apply(ctx, args)
            onFulfilled(undefined) // kick off the process

            function onFulfilled(res: any) {
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
                return null
            }

            function onRejected(err: any) {
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
                if (ret.done) return resolve(ret.value)
                // TODO: support more type of values? See https://github.com/tj/co/blob/249bbdc72da24ae44076afd716349d2089b31c4c/index.js#L100
                if (!ret.value || typeof ret.value.then !== "function")
                    fail("Only promises can be yielded to asyncAction, got: " + ret)
                return ret.value.then(onFulfilled, onRejected)
            }
        })
    }
}

function flowDecorator(target: any, propertyName: string, descriptor: BabelDescriptor) {
    return {
        configurable: true,
        enumerable: false,
        get() {
            addHiddenFinalProp(
                this,
                propertyName,
                flow(
                    propertyName,
                    descriptor.initializer ? descriptor.initializer.call(this) : descriptor.value
                )
            )
            return this[propertyName]
        },
        set(v: any) {
            addHiddenFinalProp(this, propertyName, flow(propertyName, v))
        }
    }
}

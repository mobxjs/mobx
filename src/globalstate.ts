import { getGlobal, deprecated } from "../utils/utils"
import { IDerivation } from "./derivation"
import { Reaction } from "./reaction"
import { IObservable } from "./observable"

export let globalState: MobxState = new MobxState()

let shareGlobalStateCalled = false
let runInIsolationCalled = false
let warnedAboutMultipleInstances = false

{
    const global = getGlobal()
    if (!global.__mobxInstanceCount) {
        global.__mobxInstanceCount = 1
    } else {
        global.__mobxInstanceCount++
        setTimeout(() => {
            if (!shareGlobalStateCalled && !runInIsolationCalled && !warnedAboutMultipleInstances) {
                warnedAboutMultipleInstances = true
                console.warn(
                    "[mobx] Warning: there are multiple mobx instances active. This might lead to unexpected results. See https://github.com/mobxjs/mobx/issues/1082 for details."
                )
            }
        })
    }
}

export function isolateGlobalState() {
    runInIsolationCalled = true
    getGlobal().__mobxInstanceCount--
}

export function shareGlobalState() {
    // TODO: remove in 4.0; just use peer dependencies instead.
    deprecated(
        "Using `shareGlobalState` is not recommended, use peer dependencies instead. See https://github.com/mobxjs/mobx/issues/1082 for details."
    )
    shareGlobalStateCalled = true
    const global = getGlobal()
    const ownState = globalState

    /**
     * Backward compatibility check
     */
    if (global.__mobservableTrackingStack || global.__mobservableViewStack)
        throw new Error("[mobx] An incompatible version of mobservable is already loaded.")
    if (global.__mobxGlobal && global.__mobxGlobal.version !== ownState.version)
        throw new Error("[mobx] An incompatible version of mobx is already loaded.")
    if (global.__mobxGlobal) globalState = global.__mobxGlobal
    else global.__mobxGlobal = ownState
}

export function getGlobalState(): any {
    return globalState
}

export function registerGlobals() {
    // no-op to make explicit why this file is loaded
}

/**
 * For testing purposes only; this will break the internal state of existing observables,
 * but can be used to get back at a stable state after throwing errors
 */
export function resetGlobalState() {
    globalState.reset()
}

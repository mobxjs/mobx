/**
 * (c) Michel Weststrate 2015 - 2016
 * MIT Licensed
 *
 * Welcome to the mobx sources! To get an global overview of how MobX internally works,
 * this is a good place to start:
 * https://medium.com/@mweststrate/becoming-fully-reactive-an-in-depth-explanation-of-mobservable-55995262a254#.xvbh6qd74
 *
 * Source folders:
 * ===============
 *
 * - api/     Most of the public static methods exposed by the module can be found here.
 * - core/    Implementation of the MobX algorithm; atoms, derivations, reactions, dependency trees, optimizations. Cool stuff can be found here.
 * - types/   All the magic that is need to have observable objects, arrays and values is in this folder. Including the modifiers like `asFlat`.
 * - utils/   Utility stuff.
 *
 */

declare var window: any
try {
    // define process.env if needed
    // if this is not a production build in the first place
    // (in which case the expression below would be substituted with 'production')
    process.env.NODE_ENV
} catch (e) {
    var g = typeof window !== "undefined" ? window : global
    if (typeof process === "undefined") g.process = {}
    g.process.env = {}
}

;(() => {
    function testCodeMinification() {}
    if (
        testCodeMinification.name !== "testCodeMinification" &&
        process.env.NODE_ENV !== "production"
    ) {
        console.warn(
            "[mobx] you are running a minified build, but 'process.env.NODE_ENV' was not set to 'production' in your bundler. This results in an unnecessarily large and slow bundle"
        )
    }
})()

export { IObservable, IDepTreeNode } from "./core/observable"
export { Reaction, IReactionPublic, IReactionDisposer } from "./core/reaction"
export { IDerivation, untracked, IDerivationState } from "./core/derivation"
export { IAtom, createAtom } from "./core/atom"

export { IAction } from "./core/action"
export { spy } from "./core/spy"
export { IComputedValue } from "./core/computedvalue"

export { IEqualsComparer, comparer } from "./utils/comparer"
export { IEnhancer } from "./types/modifiers"
export { IInterceptable, IInterceptor } from "./types/intercept-utils"
export { IListenable } from "./types/listen-utils"

export {
    IObjectWillChange,
    IObjectDidChange,
    IObservableObject,
    isObservableObject
} from "./types/observableobject"
export {
    IValueDidChange,
    IValueWillChange,
    IObservableValue,
    isObservableValue as isBoxedObservable
} from "./types/observablevalue"
export {
    IObservableArray,
    IArrayWillChange,
    IArrayWillSplice,
    IArrayChange,
    IArraySplice,
    isObservableArray
} from "./types/observablearray"
export {
    IKeyValueMap,
    ObservableMap,
    IMapEntries,
    IMapEntry,
    IMapWillChange,
    IMapDidChange,
    isObservableMap,
    IObservableMapInitialValues
} from "./types/observablemap"

export { transaction } from "./api/transaction"
export { observable, IObservableFactory, IObservableFactories } from "./api/observable"
export { computed, IComputed } from "./api/computed"
export { isObservable, isObservableProp } from "./api/isobservable"
export { isComputed, isComputedProp } from "./api/iscomputed"
export { extendObservable, extendShallowObservable } from "./api/extendobservable"
export { observe } from "./api/observe"
export { intercept } from "./api/intercept"
export { autorun, reaction, IReactionOptions } from "./api/autorun"
export { when, IWhenOptions } from "./api/when"

export { action, isAction, runInAction, IActionFactory } from "./api/action"
export { keys, values, set, remove, has, get } from "./api/object-api"
export { decorate } from "./api/decorate"
export { configure } from "./api/configure"
export { onBecomeObserved, onBecomeUnobserved } from "./api/become-observed"
export { flow } from "./api/flow"

export { toJS } from "./api/tojs"
export { trace } from "./api/trace"

export { Iterator } from "./utils/iterable"
export { IObserverTree, IDependencyTree, getDependencyTree, getObserverTree } from "./api/extras"

export {
    resetGlobalState as _resetGlobalState,
    getGlobalState as _getGlobalState
} from "./core/globalstate"
export { getDebugName, getAtom, getAdministration as _getAdministration } from "./types/type-utils"
export { allowStateChanges as _allowStateChanges } from "./core/action"
export { Lambda, isArrayLike } from "./utils/utils"
export { isComputingDerivation as _isComputingDerivation } from "./core/derivation"
export { onReactionError } from "./core/reaction"
export { interceptReads as _interceptReads } from "./api/intercept-read"
export { IComputedValueOptions } from "./core/computedvalue"

// This line should come after all the imports as well, for the same reason
// as noted above. I will file a bug with rollupjs - @rossipedia
import "./core/globalstate"

// Devtools support
import { spy } from "./core/spy"
import { getDebugName } from "./types/type-utils"
import { fail } from "./utils/utils"

declare var __MOBX_DEVTOOLS_GLOBAL_HOOK__: { injectMobx: ((any) => void) }
if (typeof __MOBX_DEVTOOLS_GLOBAL_HOOK__ === "object") {
    // See: https://github.com/andykog/mobx-devtools/
    __MOBX_DEVTOOLS_GLOBAL_HOOK__.injectMobx({
        spy,
        extras: {
            getDebugName
        }
    })
}

// TODO: remove in some future build
if (
    process.env.NODE_ENV !== "production" &&
    typeof module !== "undefined" &&
    typeof module.exports !== "undefined"
) {
    ;[
        "extras",
        "default",
        "Atom",
        "BaseAtom",
        "ObservableMap",
        "asFlat",
        "asMap",
        "asReference",
        "asStructure",
        "autorunAsync",
        "createTranformer",
        "expr",
        "isModifierDescriptor",
        "isStrictModeEnabled",
        "map",
        "useStrict",
        "whyRun"
    ].forEach(prop => {
        Object.defineProperty(module.exports, prop, {
            enumerable: false,
            get() {
                fail(
                    `'${prop}' is no longer part of the public MobX api. Please consult the changelog to find out where this functionality went`
                )
            },
            set() {}
        })
    })
}

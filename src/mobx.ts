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
export { IObservable, IDepTreeNode } from "./core/observable"
export { Reaction, IReactionPublic, IReactionDisposer } from "./core/reaction"
export { IDerivation, untracked, IDerivationState } from "./core/derivation"
export { IAtom, createAtom } from "./core/atom"

export { useStrict, IAction } from "./core/action"
export { spy } from "./core/spy"
export { IComputedValue } from "./core/computedvalue"

export { IEqualsComparer, comparer } from "./types/comparer"
export { IModifierDescriptor, IEnhancer, isModifierDescriptor } from "./types/modifiers"
export { IInterceptable, IInterceptor } from "./types/intercept-utils"
export { IListenable } from "./types/listen-utils"

export {
    IObjectWillChange,
    IObjectChange,
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
    IMapChange,
    IMapChangeUpdate,
    IMapChangeAdd,
    IMapChangeBase,
    IMapChangeDelete,
    isObservableMap,
    IObservableMapInitialValues,
    IMap
} from "./types/observablemap"

export { transaction } from "./api/transaction"
export { observable, IObservableFactory, IObservableFactories } from "./api/observable"
export { computed, IComputed, IComputedValueOptions } from "./api/computed"
export { isObservable, isObservableProp } from "./api/isobservable"
export { isComputed, isComputedProp } from "./api/iscomputed"
export { extendObservable, extendShallowObservable } from "./api/extendobservable"
export { observe } from "./api/observe"
export { intercept } from "./api/intercept"
export { autorun, when, reaction, IReactionOptions } from "./api/autorun"
export { action, isAction, runInAction, IActionFactory } from "./api/action"
export { keys, values, set, remove } from "./api/object-api"
export { decorate } from "./api/decorate"
export { onBecomeObserved, onBecomeUnobserved } from "./api/become-observed"

export { toJS } from "./api/tojs"
export { trace } from "./api/trace"

export { Iterator } from "./utils/iterable"
export { IObserverTree, IDependencyTree, getDependencyTree, getObserverTree } from "./api/extras"

export {
    resetGlobalState as _resetGlobalState,
    getGlobalState as _getGlobalState,
    isolateGlobalState
} from "./core/globalstate"
export { getDebugName, getAtom, getAdministration as _getAdministration } from "./types/type-utils"
export { allowStateChanges as _allowStateChanges } from "./core/action"
export { Lambda, deepEqual, isArrayLike } from "./utils/utils"
export { isComputingDerivation as _isComputingDerivation } from "./core/derivation"
export { setReactionScheduler as _setReactionScheduler, onReactionError } from "./core/reaction"
export { reserveArrayBuffer as _reserveArrayBuffer /* See #734 */ } from "./types/observablearray"
export { interceptReads as _interceptReads } from "./api/intercept-read"

// This line should come after all the imports as well, for the same reason
// as noted above. I will file a bug with rollupjs - @rossipedia
import "./core/globalstate"

// Devtools support
import { spy } from "./core/spy"
import { getDebugName } from "./types/type-utils"

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

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

// TODO: rename interfaces to types?
export { IObservable, IDepTreeNode, runInAction,
Reaction, IReactionPublic, IReactionDisposer, IAtom, Atom, BaseAtom, IComputedValue, IEqualsComparer, useStrict, isStrictModeEnabled, IAction
 untracked, IInterceptable, IInterceptor, IListenable,
 transaction,
 IValueDidChange,
 IValueWillChange,
 IObservableValue,
 isObservableValue as isBoxedObservable,
 IObserverTree, IDependencyTree,
 autorun, autorunAsync, when, reaction, IReactionOptions ,
  action, isAction, IActionFactory

} from "../mobx-core/index"

export { spy } from "./core/spy"

export {  comparer } from "./types/comparer"
export { IModifierDescriptor, IEnhancer, isModifierDescriptor } from "./types/modifiers"
export {
    IObjectWillChange,
    IObjectChange,
    IObservableObject,
    isObservableObject
} from "./types/observableobject"

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
    map,
    IObservableMapInitialValues,
    IMap
} from "./types/observablemap"

export { observable, IObservableFactory, IObservableFactories } from "./api/observable"
export { computed, IComputed, IComputedValueOptions } from "./api/computed"
export { isObservable } from "./api/isobservable"
export { isComputed } from "./api/iscomputed"
export { extendObservable, extendShallowObservable } from "./api/extendobservable"
export { observe } from "./api/observe"
export { intercept } from "./api/intercept"


export { expr } from "./api/expr"
export { toJS } from "./api/tojs"
export { ITransformer, createTransformer } from "./api/createtransformer"
export { whyRun } from "./api/whyrun"

export { isArrayLike } from "./utils/utils"
export { Iterator } from "./utils/iterable"

import {
    resetGlobalState,
    getGlobalState,
    isolateGlobalState
} from "./globalstate"
import { IDerivation } from "./core/derivation"
import { IDepTreeNode } from "./core/observable"
import { IObserverTree, IDependencyTree, getDependencyTree, getObserverTree } from "./api/extras"
import { allowStateChanges, Lambda,  } from "./core/action"
import { isComputingDerivation } from "./core/derivation"
import { setReactionScheduler, onReactionError } from "./core/reaction"
import { IObservableValue } from "./types/observablevalue"

import { getDebugName, getAtom, getAdministration } from "./types/type-utils"
import { spyReport, spyReportEnd, spyReportStart, isSpyEnabled } from "./core/spy"
import {  deepEqual } from "./utils/utils"

import { reserveArrayBuffer, IObservableArray } from "./types/observablearray"
import { interceptReads } from "./api/intercept-read"
import { ObservableMap } from "./types/observablemap"
import { registerGlobals } from "./core/globalstate"

// This line should come after all the imports as well, for the same reason
// as noted above. I will file a bug with rollupjs - @rossipedia
registerGlobals()

export const extras = {
    allowStateChanges,
    deepEqual,
    getAtom,
    getDebugName,
    getDependencyTree,
    getAdministration,
    getGlobalState,
    getObserverTree,
    interceptReads,
    isComputingDerivation,
    isSpyEnabled,
    onReactionError,
    reserveArrayBuffer, // See #734
    resetGlobalState,
    isolateGlobalState,
    spyReport,
    spyReportEnd,
    spyReportStart,
    setReactionScheduler
}


import { IObservable } from "./core/observable"
import { Reaction, IReactionPublic, IReactionDisposer } from "./core/reaction"
import { untracked, IDerivationState } from "./core/derivation"
import { IAtom, Atom, BaseAtom } from "./core/atom"
import { useStrict, isStrictModeEnabled, IAction } from "./core/action"
import { spy } from "./core/spy"
import { IComputedValue } from "./core/computedvalue"
import { IEqualsComparer, comparer } from "./types/comparer"
import { asReference, asFlat, asStructure, asMap } from "./types/modifiers-old"
import { IModifierDescriptor, IEnhancer, isModifierDescriptor } from "./types/modifiers"
import { IInterceptable, IInterceptor } from "./types/intercept-utils"
import { IListenable } from "./types/listen-utils"
import {
    IObjectWillChange,
    IObjectChange,
    IObservableObject,
    isObservableObject
} from "./types/observableobject"
import {
    IValueDidChange,
    IValueWillChange,
    isObservableValue as isBoxedObservable
} from "./types/observablevalue"
import {
    IArrayWillChange,
    IArrayWillSplice,
    IArrayChange,
    IArraySplice,
    isObservableArray
} from "./types/observablearray"
import {
    IKeyValueMap,
    IMapEntries,
    IMapEntry,
    IMapWillChange,
    IMapChange,
    IMapChangeUpdate,
    IMapChangeAdd,
    IMapChangeBase,
    IMapChangeDelete,
    isObservableMap,
    map,
    IObservableMapInitialValues,
    IMap
} from "./types/observablemap"
import { observable, IObservableFactory, IObservableFactories } from "./api/observable"
import { computed, IComputed, IComputedValueOptions } from "./api/computed"
import { isObservable } from "./api/isobservable"
import { isComputed } from "./api/iscomputed"
import { extendObservable, extendShallowObservable } from "./api/extendobservable"
import { observe } from "./api/observe"
import { intercept } from "./api/intercept"
import { autorun, autorunAsync, when, reaction, IReactionOptions } from "./api/autorun"
import { action, IActionFactory } from "./api/action"
import { expr } from "./api/expr"
import { toJS } from "./api/tojs"
import { ITransformer, createTransformer } from "./api/createtransformer"
import { whyRun } from "./api/whyrun"
import { isArrayLike } from "./utils/utils"
import { Iterator } from "./utils/iterable"

// Devtools support

declare var __MOBX_DEVTOOLS_GLOBAL_HOOK__: { injectMobx: ((any) => void) }
if (typeof __MOBX_DEVTOOLS_GLOBAL_HOOK__ === "object") {
    __MOBX_DEVTOOLS_GLOBAL_HOOK__.injectMobx({ spy, extras })
}

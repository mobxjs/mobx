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
 * - ../mobx-core/    Implementation of the MobX algorithm; atoms, derivations, reactions, dependency trees, optimizations. Cool stuff can be found here.
 * - api/     Most of the public static methods exposed by the module can be found here.
 * - types/   All the magic that is need to have observable objects, arrays and values is in this folder. Including the modifiers like `asFlat`.
 * - utils/   Utility stuff.
 *
 */

export * from "./mobx-core-api"

export { comparer } from "./types/comparer"
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
	isObservableArray,
	reserveArrayBuffer
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
export { action } from "./api/action"
export { expr } from "./api/expr"
export { toJS } from "./api/tojs"
export { ITransformer, createTransformer } from "./api/createtransformer"
export { whyRun } from "./api/whyrun"
export { isArrayLike, deepEqual } from "./utils/utils"
export { Iterator } from "./utils/iterable"

export { resetGlobalState, getGlobalState, isolateGlobalState } from "./globalstate"

// Devtools support
import { spy } from "./mobx-core-api"
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

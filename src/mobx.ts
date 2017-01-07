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

import {registerGlobals} from "./core/globalstate";
registerGlobals();

export { IAtom, Atom, BaseAtom                                } from "./core/atom";
export { IObservable, IDepTreeNode                            } from "./core/observable";
export { Reaction, IReactionPublic, IReactionDisposer         } from "./core/reaction";
export { IDerivation, untracked, IDerivationState             } from "./core/derivation";
export { useStrict, isStrictModeEnabled                       } from "./core/action";
export { spy                                                  } from "./core/spy";
export { IComputedValue                                       } from "./core/computedvalue";

export { asReference, asFlat, asStructure, asMap              } from "./types/modifiers-old";
export { IModifierDescriptor, IEnhancer, isModifierDescriptor } from "./types/modifiers";
export { IInterceptable, IInterceptor                         } from "./types/intercept-utils";
export { IListenable                                          } from "./types/listen-utils";
export { IObjectWillChange, IObjectChange, IObservableObject, isObservableObject } from "./types/observableobject";

export { IValueDidChange, IValueWillChange, IObservableValue } from "./types/observablevalue";
export { IObservableArray, IArrayWillChange, IArrayWillSplice, IArrayChange, IArraySplice, isObservableArray } from "./types/observablearray";
export { IKeyValueMap, ObservableMap, IMapEntries, IMapEntry, IMapWillChange, IMapChange, isObservableMap, map, IObservableMapInitialValues, IMap } from "./types/observablemap"

export { transaction                                          } from "./api/transaction";
export { observable, IObservableFactory, IObservableFactories } from "./api/observable";
export { computed, IComputed, IComputedValueOptions           } from "./api/computed";
export { isObservable                                         } from "./api/isobservable";
export { isComputed                                           } from "./api/iscomputed";
export { extendObservable, extendShallowObservable            } from "./api/extendobservable";
export { observe                                              } from "./api/observe";
export { intercept                                            } from "./api/intercept";
export { autorun, autorunAsync, when, reaction, IReactionOptions  } from "./api/autorun";
export { action, isAction, runInAction, IActionFactory        } from "./api/action";

export { expr                                                 } from "./api/expr";
export { toJS                                                 } from "./api/tojs";
export { ITransformer, createTransformer                      } from "./api/createtransformer";
export { whyRun                                               } from "./api/whyrun";

export { Lambda, isArrayLike                                  } from "./utils/utils";
export { Iterator                                             } from "./utils/iterable";
export { IObserverTree, IDependencyTree                       } from "./api/extras";

import { resetGlobalState, shareGlobalState, getGlobalState } from "./core/globalstate";
import { IDerivation } from "./core/derivation";
import { IDepTreeNode } from "./core/observable";
import { IObserverTree, IDependencyTree, getDependencyTree, getObserverTree } from "./api/extras";
import { getDebugName, getAtom, getAdministration } from "./types/type-utils";
import { allowStateChanges } from "./core/action";
import { spyReport, spyReportEnd, spyReportStart, isSpyEnabled } from "./core/spy";
import { Lambda } from "./utils/utils";
import { isComputingDerivation } from "./core/derivation";
import { setReactionScheduler, onReactionError } from "./core/reaction";

export const extras = {
	allowStateChanges,
	getAtom,
	getDebugName,
	getDependencyTree,
	getAdministration,
	getGlobalState,
	getObserverTree,
	isComputingDerivation,
	isSpyEnabled,
	onReactionError,
	resetGlobalState,
	shareGlobalState,
	spyReport,
	spyReportEnd,
	spyReportStart,
	setReactionScheduler
};

declare var __MOBX_DEVTOOLS_GLOBAL_HOOK__: { injectMobx: ((any) => void)};
declare var module: { exports: any };
if (typeof __MOBX_DEVTOOLS_GLOBAL_HOOK__ === "object") {
	__MOBX_DEVTOOLS_GLOBAL_HOOK__.injectMobx(module.exports)
}

/**
 * (c) Michel Weststrate 2015 - 2019
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

import { getGlobal, spy, getDebugName, fail } from "./internal"

try {
    // define process.env if needed
    // if this is not a production build in the first place
    // (in which case the expression below would be substituted with 'production')
    // tslint:disable-next-line
    process.env.NODE_ENV
} catch (e) {
    const g = getGlobal()
    if (typeof process === "undefined") g.process = {}
    g.process.env = {}
}

;(() => {
    function testCodeMinification() {}
    if (
        testCodeMinification.name !== "testCodeMinification" &&
        process.env.NODE_ENV !== "production" &&
        process.env.IGNORE_MOBX_MINIFY_WARNING !== "true"
    ) {
        // trick so it doesn't get replaced
        const varName = ["process", "env", "NODE_ENV"].join(".")
        console.warn(
            `[mobx] you are running a minified build, but '${varName}' was not set to 'production' in your bundler. This results in an unnecessarily large and slow bundle`
        )
    }
})()

export {
    IObservable,
    IDepTreeNode,
    Reaction,
    IReactionPublic,
    IReactionDisposer,
    IDerivation,
    untracked,
    IDerivationState,
    IAtom,
    createAtom,
    IAction,
    spy,
    IComputedValue,
    IEqualsComparer,
    comparer,
    IEnhancer,
    IInterceptable,
    IInterceptor,
    IListenable,
    IObjectWillChange,
    IObjectDidChange,
    IObservableObject,
    isObservableObject,
    IValueDidChange,
    IValueWillChange,
    IObservableValue,
    isObservableValue as isBoxedObservable,
    IObservableArray,
    IArrayWillChange,
    IArrayWillSplice,
    IArrayChange,
    IArraySplice,
    isObservableArray,
    IKeyValueMap,
    ObservableMap,
    IMapEntries,
    IMapEntry,
    IMapWillChange,
    IMapDidChange,
    isObservableMap,
    IObservableMapInitialValues,
    ObservableSet,
    isObservableSet,
    ISetDidChange,
    ISetWillChange,
    IObservableSetInitialValues,
    transaction,
    observable,
    IObservableFactory,
    IObservableFactories,
    computed,
    IComputed,
    isObservable,
    isObservableProp,
    isComputed,
    isComputedProp,
    extendObservable,
    extendShallowObservable,
    observe,
    intercept,
    autorun,
    IAutorunOptions,
    reaction,
    IReactionOptions,
    when,
    IWhenOptions,
    action,
    isAction,
    runInAction,
    IActionFactory,
    keys,
    values,
    entries,
    set,
    remove,
    has,
    get,
    decorate,
    configure,
    onBecomeObserved,
    onBecomeUnobserved,
    flow,
    toJS,
    trace,
    IObserverTree,
    IDependencyTree,
    getDependencyTree,
    getObserverTree,
    resetGlobalState as _resetGlobalState,
    getGlobalState as _getGlobalState,
    getDebugName,
    getAtom,
    getAdministration as _getAdministration,
    allowStateChanges as _allowStateChanges,
    allowStateChangesInsideComputed as _allowStateChangesInsideComputed,
    Lambda,
    isArrayLike,
    isComputingDerivation as _isComputingDerivation,
    onReactionError,
    interceptReads as _interceptReads,
    IComputedValueOptions,
    startActionWithFinisher
} from "./internal"

// forward compatibility with mobx, so that packages can easily support mobx 4 & 5
export const $mobx = "$mobx"

// Devtools support
declare const __MOBX_DEVTOOLS_GLOBAL_HOOK__: { injectMobx: (any) => void }
if (typeof __MOBX_DEVTOOLS_GLOBAL_HOOK__ === "object") {
    // See: https://github.com/andykog/mobx-devtools/
    __MOBX_DEVTOOLS_GLOBAL_HOOK__.injectMobx({
        spy,
        extras: {
            getDebugName
        },
        $mobx
    })
}

// TODO: remove in some future build
if (
    process.env.NODE_ENV !== "production" &&
    typeof module !== "undefined" &&
    typeof module.exports !== "undefined"
) {
    let warnedAboutDefaultExport = false
    Object.defineProperty(module.exports, "default", {
        enumerable: false,
        get() {
            if (!warnedAboutDefaultExport) {
                warnedAboutDefaultExport = true
                console.warn(
                    `The MobX package does not have a default export. Use 'import { thing } from "mobx"' (recommended) or 'import * as mobx from "mobx"' instead."`
                )
            }
            return undefined
        }
    })
    ;[
        "extras",
        "Atom",
        "BaseAtom",
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

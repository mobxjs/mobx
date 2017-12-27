var mobx = require("../")

test("correct api should be exposed", function() {
    expect(Object.keys(mobx).sort()).toEqual([
        "Atom",
        "BaseAtom", // TODO: remove somehow
        "IDerivationState",
        "ObservableMap",
        "Reaction",
        "action",
        "asFlat",
        "asMap",
        "asReference",
        "asStructure",
        "autorun",
        "autorunAsync",
        "computed",
        "comparer",
        "createTransformer",
        "default",
        "expr",
        "extendObservable",
        "extendShallowObservable",
        "extras",
        "intercept",
        "isAction",
        "isArrayLike",
        "isBoxedObservable",
        "isComputed",
        "isModifierDescriptor",
        "isObservable",
        "isObservableArray",
        "isObservableMap",
        "isObservableObject",
        "isStrictModeEnabled",
        "map",
        "observable",
        "observe",
        "reaction",
        "runInAction",
        "spy",
        "toJS",
        "transaction",
        "untracked",
        "useStrict",
        "when",
        "whyRun"
    ].sort())
    expect(Object.keys(mobx).filter(function(key) {
        return mobx[key] == undefined
    }).length).toBe(0)

    expect(Object.keys(mobx.extras).sort()).toEqual([
        "allowStateChanges",
        "deepEqual",
        "getAdministration",
        "getAtom",
        "getDebugName",
        "getDependencyTree",
        "getGlobalState",
        "getObserverTree",
        "interceptReads",
        "isComputingDerivation",
        "isSpyEnabled",
        "isolateGlobalState",
        "onReactionError",
        "reserveArrayBuffer",
        "resetGlobalState",
        "setReactionScheduler",
        "shareGlobalState",
        "spyReport",
        "spyReportEnd",
        "spyReportStart"
    ].sort())
    expect(Object.keys(mobx.extras).filter(function(key) {
        return mobx.extras[key] == undefined
    }).length).toBe(0)
})

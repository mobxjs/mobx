const mobx = require("../../src/mobx.ts")

test("correct api should be exposed", function () {
    expect(
        Object.keys(mobx)
            .filter(key => mobx[key] !== undefined)
            .sort()
    ).toEqual(
        [
            "$mobx", // adminstration symbol
            "action",
            "actionBound",
            "_allowStateChanges",
            "_allowStateChangesInsideComputed",
            "_allowStateReadsEnd",
            "_allowStateReadsStart",
            "_autoAction",
            "_autoActionBound",
            "autorun",
            "compareDefault",
            "compareIdentity",
            "compareShallow",
            "compareStructural",
            "computed",
            "computedStruct",
            "configure",
            "createAtom",
            "defineProperty",
            "extendObservable",
            "flow",
            "flowBound",
            "isFlow",
            "flowResult",
            "FlowCancellationError",
            "isFlowCancellationError",
            "_getAdministration",
            "getAtom",
            "_getGlobalState",
            "isAction",
            "isBoxedObservable",
            "isComputed",
            "isComputedProp",
            "_isComputingDerivation",
            "isObservable",
            "isObservableArray",
            "isObservableMap",
            "isObservableSet",
            "isObservableObject",
            "isObservableProp",
            "makeAutoObservable",
            "makeObservable",
            "ObservableMap",
            "ObservableSet",
            "observable",
            "observableDeep",
            "observableRef",
            "observableShallow",
            "observableStruct",
            "onReactionError",
            "onBecomeObserved",
            "onBecomeUnobserved",
            "Reaction",
            "reaction",
            "_resetGlobalState",
            "runInAction",
            "toJS",
            "transaction",
            "untracked",
            "when",
            "_startAction",
            "_endAction",
            "override"
        ].sort()
    )
})

test("mobx has no dependencies", () => {
    const pkg = require("../../package.json")
    expect(pkg.dependencies).toEqual({})
})

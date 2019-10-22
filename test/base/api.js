import * as fs from "fs"
const mobx = require("../../src/mobx.ts")

test("correct api should be exposed", function() {
    expect(
        Object.keys(mobx)
            .filter(key => mobx[key] !== undefined)
            .sort()
    ).toEqual(
        [
            "action",
            "_allowStateChanges",
            "_allowStateChangesInsideComputed",
            "autorun",
            "comparer",
            "computed",
            "configure",
            "createAtom",
            "decorate",
            "extendObservable",
            "extendShallowObservable", // deprecated but still public
            "flow",
            "FlowCancellationError",
            "get",
            "_getAdministration",
            "getAtom",
            "getDebugName",
            "getDependencyTree",
            "has",
            "_getGlobalState",
            "getObserverTree",
            "IDerivationState",
            "intercept",
            "_interceptReads",
            "isAction",
            "isArrayLike",
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
            "keys",
            "ObservableMap",
            "ObservableSet",
            "observable",
            "observe",
            "onReactionError",
            "onBecomeObserved",
            "onBecomeUnobserved",
            "Reaction",
            "reaction",
            "remove",
            "_resetGlobalState",
            "runInAction",
            "set",
            "spy",
            "toJS",
            "trace",
            "transaction",
            "untracked",
            "values",
            "entries",
            "when",
            "$mobx",
            "_startAction",
            "_endAction"
        ].sort()
    )
})

test("mobx has no dependencies", () => {
    const pkg = JSON.parse(fs.readFileSync(__dirname + "/../../package.json", "utf8"))
    expect(pkg.dependencies).toEqual({})
})

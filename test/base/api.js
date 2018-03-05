import * as fs from "fs"
var mobx = require("../../src/mobx.ts")

test("correct api should be exposed", function() {
    expect(Object.keys(mobx).filter(key => mobx[key] !== undefined).sort()).toEqual(
        [
            "action",
            "_allowStateChanges",
            "autorun",
            "comparer",
            "computed",
            "configure",
            "createAtom",
            "decorate",
            "extendObservable",
            "extendShallowObservable",
            "_getAdministration",
            "getAtom",
            "getDebugName",
            "getDependencyTree",
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
            "isObservableObject",
            "isObservableProp",
            "keys",
            "observable",
            "ObservableMap",
            "observe",
            "onReactionError",
            "onBecomeObserved",
            "onBecomeUnobserved",
            "Reaction",
            "reaction",
            "remove",
            "_reserveArrayBuffer",
            "_resetGlobalState",
            "runInAction",
            "_setReactionScheduler",
            "set",
            "spy",
            "toJS",
            "trace",
            "transaction",
            "untracked",
            "values",
            "when"
        ].sort()
    )
})

test("mobx has no dependencies", () => {
    const pkg = JSON.parse(fs.readFileSync(__dirname + "/../../package.json", "utf8"))
    expect(pkg.dependencies).toEqual({})
})

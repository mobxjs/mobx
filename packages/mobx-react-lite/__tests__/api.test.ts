const api = require("../src/index.ts")

test("correct api should be exposed", function () {
    expect(
        Object.keys(api)
            .filter(key => api[key] !== undefined)
            .sort()
    ).toEqual(
        [
            "isUsingStaticRendering",
            "enableStaticRendering",
            "observer",
            "Observer",
            "useLocalObservable",
            "useLocalStore",
            "useAsObservableSource",
            "clearTimers",
            "useObserver",
            "isObserverBatched",
            "observerBatching",
            "useStaticRendering"
        ].sort()
    )
})

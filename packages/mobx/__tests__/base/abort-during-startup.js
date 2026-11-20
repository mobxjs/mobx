const mobx = require("../../src/mobx.ts")

test.each(["autorun", "reaction expression", "reaction effect", "when effect"])(
    "%s stops when its signal aborts during the first run",
    kind => {
        const state = mobx.observable.box(0)
        const controller = new AbortController()
        let calls = 0
        const read = () => {
            calls++
            controller.abort()
            return state.get()
        }
        const options = { signal: controller.signal }
        let dispose
        if (kind === "autorun") {
            dispose = mobx.autorun(read, options)
        } else if (kind === "reaction expression") {
            dispose = mobx.reaction(read, () => {}, options)
        } else if (kind === "reaction effect") {
            dispose = mobx.reaction(() => state.get(), read, {
                ...options,
                fireImmediately: true
            })
        } else {
            dispose = mobx.when(
                () => {
                    read()
                    return false
                },
                () => {},
                options
            )
        }
        try {
            mobx.runInAction(() => state.set(1))
            expect(calls).toBe(1)
            expect(mobx.getObserverTree(state).observers || []).toHaveLength(0)
        } finally {
            dispose()
        }
    }
)

test("promised when rejects if its predicate aborts during setup", async () => {
    const state = mobx.observable.box(0)
    const controller = new AbortController()
    const promise = mobx.when(
        () => {
            state.get()
            controller.abort()
            return false
        },
        { signal: controller.signal }
    )

    // Flush promise callbacks without leaving a broken regression pending forever.
    let outcome
    promise.then(
        () => {
            outcome = "resolved"
        },
        error => {
            outcome = error.message
        }
    )
    await new Promise(resolve => setTimeout(resolve, 0))
    try {
        expect(outcome).toBe("WHEN_ABORTED")
        expect(mobx.getObserverTree(state).observers || []).toHaveLength(0)
    } finally {
        promise.cancel()
    }
})

test("startup abort does not leave an abort listener registered", () => {
    const controller = new AbortController()
    const addListener = jest.spyOn(controller.signal, "addEventListener")
    const dispose = mobx.autorun(() => controller.abort(), { signal: controller.signal })
    try {
        expect(addListener).not.toHaveBeenCalled()
    } finally {
        dispose()
    }
})

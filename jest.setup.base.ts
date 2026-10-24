global.setImmediate = global.setImmediate || ((fn, ...args) => global.setTimeout(fn, 0, ...args))

// Takes the mobx module from the caller so the reset hits the same mobx copy the tests use
export function setupMobxTestState(
    { configure, _getGlobalState, _resetGlobalState },
    afterEachExtra = () => {}
) {
    function reset() {
        _resetGlobalState()
        _getGlobalState().spyListeners = []
        configure({
            enforceActions: "never",
            computedRequiresReaction: false,
            reactionRequiresObservable: false,
            observableRequiresReaction: false,
            disableErrorBoundaries: false,
            safeDescriptors: true
        })
    }

    beforeEach(() => {
        // @ts-ignore
        global.__DEV__ = true
        reset()
    })

    afterEach(() => {
        afterEachExtra()
        jest.useRealTimers()
        jest.restoreAllMocks()
        reset()
    })
}

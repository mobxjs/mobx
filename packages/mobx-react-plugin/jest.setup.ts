import { configure, _getGlobalState, _resetGlobalState } from "mobx"

function resetMobxState() {
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
    resetMobxState()
})

afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
    resetMobxState()
})

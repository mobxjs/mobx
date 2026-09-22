import { configure, _getGlobalState, _resetGlobalState } from "./src/mobx"

global.setImmediate = global.setImmediate || ((fn, ...args) => global.setTimeout(fn, 0, ...args))

function resetMobxTestState() {
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
    resetMobxTestState()
})

afterEach(resetMobxTestState)

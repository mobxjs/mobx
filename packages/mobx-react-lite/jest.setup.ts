import "@testing-library/jest-dom/extend-expect"
import { cleanup } from "@testing-library/react"
import { configure, _getGlobalState, _resetGlobalState } from "mobx"

global.setImmediate = global.setImmediate || ((fn, ...args) => global.setTimeout(fn, 0, ...args))

function resetMobxReactTestState() {
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
    resetMobxReactTestState()
})

afterEach(() => {
    cleanup()
    jest.useRealTimers()
    jest.restoreAllMocks()
    resetMobxReactTestState()
})

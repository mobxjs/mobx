import { configure, _resetGlobalState } from "./src/mobx"

global.setImmediate = global.setImmediate || ((fn, ...args) => global.setTimeout(fn, 0, ...args))

beforeEach(() => {
    // @ts-ignore
    global.__DEV__ = true
    _resetGlobalState()
    configure({
        enforceActions: "never"
    })
})

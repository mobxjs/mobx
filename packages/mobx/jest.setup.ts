import { configure, _resetGlobalState } from "./src/mobx"

beforeEach(() => {
    // @ts-ignore
    global.__DEV__ = true
    _resetGlobalState()
    configure({
        enforceActions: "never"
    })
})

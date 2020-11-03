import { configure, _resetGlobalState } from "../src/mobx"

beforeEach(() => {
    _resetGlobalState()
    configure({
        enforceActions: "never"
    })
})

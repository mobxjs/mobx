import { autorun, onBecomeObserved, observable } from "../../src/mobx"

describe("become-observed", () => {
    it("work on map with number as key", () => {
        const oMap = observable.map()
        const key = 1
        oMap.set(key, observable.box("value"))
        const cb = jest.fn()
        onBecomeObserved(oMap, key, cb)
        autorun(() => oMap.get(key))
        expect(cb).toBeCalled()
    })
})

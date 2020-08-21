import {
    autorun,
    onBecomeObserved,
    observable,
    computed,
    action,
    makeObservable,
    onBecomeUnobserved
} from "../../../src/mobx"

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

test("#2309 don't trigger oBO for computeds that aren't subscribed to", () => {
    const events: string[] = []

    class Asd {
        @observable prop = 42

        @computed
        get computed() {
            return this.prop
        }

        @action
        actionProp() {
            const foo = this.prop
        }

        @action
        actionComputed() {
            const bar = this.computed
        }

        constructor() {
            makeObservable(this)
        }
    }

    const asd = new Asd()
    onBecomeObserved(asd, "prop", () => {
        events.push("onBecomeObserved")
    })

    onBecomeUnobserved(asd, "prop", () => {
        events.push("onBecomeUnobserved")
    })

    asd.actionProp()
    events.push("--")
    asd.actionComputed()
    expect(events).toEqual(["--"])
})

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

describe("#2309 onBecomeObserved inconsistencies", () => {
    let events: string[] = []

    beforeEach(() => {
        events = []
    })

    test("caseA", () => {
        // Computed {keepAlive: false} -> Observable
        const o = observable.box(1)
        const ca = computed(
            () => {
                return o.get()
            },
            { keepAlive: false }
        )

        onBecomeObserved(o, () => events.push(`o observed`))
        onBecomeUnobserved(o, () => events.push(`o unobserved`))
        onBecomeObserved(ca, () => events.push(`ca observed`))
        onBecomeUnobserved(ca, () => events.push(`ca unobserved`))
        expect(events).toEqual([])
        ca.get()
        expect(events).toEqual([])
    })

    test("caseB", () => {
        // Computed {keepAlive: false} -> Computed {keepAlive: false} -> Observable
        const o = observable.box(1)
        const ca = computed(
            () => {
                return o.get()
            },
            { keepAlive: false }
        )

        const cb = computed(
            () => {
                return ca.get() * 2
            },
            { keepAlive: false }
        )

        onBecomeObserved(o, () => events.push(`o observed`))
        onBecomeUnobserved(o, () => events.push(`o unobserved`))
        onBecomeObserved(ca, () => events.push(`ca observed`))
        onBecomeUnobserved(ca, () => events.push(`ca unobserved`))
        onBecomeObserved(cb, () => events.push(`cb observed`))
        onBecomeUnobserved(cb, () => events.push(`cb unobserved`))
        expect(events).toEqual([])
        cb.get()
        expect(events).toEqual([])
    })

    test("caseC", () => {
        // Computed {keepAlive: true} -> Observable
        const o = observable.box(1)
        const ca = computed(
            () => {
                return o.get()
            },
            { keepAlive: true }
        )

        onBecomeObserved(o, () => events.push(`o observed`))
        onBecomeUnobserved(o, () => events.push(`o unobserved`))
        onBecomeObserved(ca, () => events.push(`ca observed`))
        onBecomeUnobserved(ca, () => events.push(`ca unobserved`))
        expect(events).toEqual([])
        ca.get()
        expect(events).toEqual(["o observed"]) // everything is hot, and 'o' is really observed so that the keptAlive computed knows about its state
    })

    test("caseD", () => {
        // Computed {keepAlive: true} -> Computed {keepAlive: false} -> Observable
        // logs: `o observed`
        // potential issue: why are the callbacks not called on `ca` ?
        const o = observable.box(1)
        const ca = computed(
            () => {
                return o.get()
            },
            { keepAlive: false }
        )

        const cb = computed(
            () => {
                return ca.get() * 2
            },
            { keepAlive: true }
        )

        onBecomeObserved(o, () => events.push(`o observed`))
        onBecomeUnobserved(o, () => events.push(`o unobserved`))
        onBecomeObserved(ca, () => events.push(`ca observed`))
        onBecomeUnobserved(ca, () => events.push(`ca unobserved`))
        onBecomeObserved(cb, () => events.push(`cb observed`))
        onBecomeUnobserved(cb, () => events.push(`cb unobserved`))
        expect(events).toEqual([])
        cb.get()
        expect(events).toEqual(["ca observed", "o observed"]) // see above
    })

    test("caseE - base", () => {
        const o = observable.box(1)
        const ca = computed(
            () => {
                return o.get()
            },
            { keepAlive: false }
        )

        const cb = computed(
            () => {
                return ca.get() * 2
            },
            { keepAlive: false }
        )

        onBecomeObserved(o, () => events.push(`o observed`))
        onBecomeUnobserved(o, () => events.push(`o unobserved`))
        onBecomeObserved(ca, () => events.push(`ca observed`))
        onBecomeUnobserved(ca, () => events.push(`ca unobserved`))
        onBecomeObserved(cb, () => events.push(`cb observed`))
        onBecomeUnobserved(cb, () => events.push(`cb unobserved`))

        const u = autorun(() => cb.get())
        u()
        expect(events).toEqual([
            "cb observed",
            "ca observed",
            "o observed",
            "cb unobserved",
            "ca unobserved",
            "o unobserved"
        ])
    })

    test("caseE", () => {
        const o = observable.box(1)
        const ca = computed(
            () => {
                return o.get()
            },
            { keepAlive: false }
        )

        const cb = computed(
            () => {
                return ca.get() * 2
            },
            { keepAlive: true }
        )

        onBecomeObserved(o, () => events.push(`o observed`))
        onBecomeUnobserved(o, () => events.push(`o unobserved`))
        onBecomeObserved(ca, () => events.push(`ca observed`))
        onBecomeUnobserved(ca, () => events.push(`ca unobserved`))
        onBecomeObserved(cb, () => events.push(`cb observed`))
        onBecomeUnobserved(cb, () => events.push(`cb unobserved`))

        const u = autorun(() => cb.get())
        u()
        // Note that at this point the observables never become unobserved anymore!
        // That is correct, because if doing our kept-alive computed doesn't recompute until reobserved,
        // itself it is still observing all the values of its own deps to figure whether it is still
        // up to date or not
        expect(events).toEqual(["cb observed", "ca observed", "o observed", "cb unobserved"])

        events.splice(0)
        const u2 = autorun(() => cb.get())
        u2()
        expect(events).toEqual(["cb observed", "cb unobserved"])
    })

    test("caseF", () => {
        // Computed {keepAlive: true} -> Computed {keepAlive: false} -> Observable
        // cb.get() first then autorun() then unsub()
        const o = observable.box(1)
        const ca = computed(
            () => {
                return o.get()
            },
            { keepAlive: false }
        )

        const cb = computed(
            () => {
                return ca.get() * 2
            },
            { keepAlive: true }
        )

        onBecomeObserved(o, () => events.push(`o observed`))
        onBecomeUnobserved(o, () => events.push(`o unobserved`))
        onBecomeObserved(ca, () => events.push(`ca observed`))
        onBecomeUnobserved(ca, () => events.push(`ca unobserved`))
        onBecomeObserved(cb, () => events.push(`cb observed`))
        onBecomeUnobserved(cb, () => events.push(`cb unobserved`))
        cb.get()

        expect(events).toEqual(["ca observed", "o observed"])
        events.splice(0)
        const u = autorun(() => cb.get())
        u()
        expect(events).toEqual(["cb observed", "cb unobserved"])
    })
})

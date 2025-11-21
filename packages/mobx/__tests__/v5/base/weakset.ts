import {
    IObservableValue,
    autorun,
    computed,
    observable,
    onBecomeObserved,
    onBecomeUnobserved,
    runInAction
} from "../../../src/mobx"
const gc = require("expose-gc/function")

let events: string[] = []
beforeEach(() => {
    events = []
})

function nextFrame() {
    return new Promise(accept => setTimeout(accept, 1))
}

async function gc_cycle() {
    await nextFrame()
    gc()
    await nextFrame()
}

test("observables should not hold a reference to weak reactions", async () => {
    let x = 0
    const o = observable.box(10)

    ;(() => {
        const au = autorun(
            () => {
                x += o.get()
            },
            { weak: true }
        )

        o.set(5)
        expect(x).toEqual(15)
    })()

    await gc_cycle()
    expect((o as any).observers_.size).toEqual(0)

    o.set(20)
    expect(x).toEqual(15)
})

test("observables should hold a reference to reactions", async () => {
    let x = 0
    const o = observable.box(10)
    ;(() => {
        autorun(() => {
            x += o.get()
        }, {})

        o.set(5)
    })()

    await gc_cycle()
    expect((o as any).observers_.size).toEqual(1)

    o.set(20)
    expect(x).toEqual(35)
})

test("observables should not hold a reference to weak computeds", async () => {
    const o = observable.box(10)
    let wref
    ;(() => {
        const kac = computed(
            () => {
                return o.get()
            },
            { keepAlive: true, weak: true }
        )
        wref = new WeakRef(kac)
        kac.get()
    })()

    expect(wref.deref()).not.toEqual(null)
    await gc_cycle()
    expect(wref.deref() == null).toBeTruthy()
    expect((o as any).observers_.size).toEqual(0)
})

test("observables should hold a reference to computeds", async () => {
    const o = observable.box(10)
    let wref
    ;(() => {
        const kac = computed(
            () => {
                return o.get()
            },
            { keepAlive: true }
        )
        kac.get()
        wref = new WeakRef(kac)
    })()

    expect(wref.deref() != null).toBeTruthy()
    await nextFrame()
    gc()
    await nextFrame()
    expect(wref.deref() != null).toBeTruthy()
    expect((o as any).observers_.size).toEqual(1)
})

test("garbage collection should trigger onBOU", async () => {
    const o = observable.box(10)

    onBecomeObserved(o, () => events.push(`o observed`))
    onBecomeUnobserved(o, () => events.push(`o unobserved`))

    ;(() => {
        autorun(
            () => {
                o.get()
            },
            { weak: true }
        )
    })()

    expect(events).toEqual(["o observed"])
    await gc_cycle()
    expect(events).toEqual(["o observed", "o unobserved"])
})

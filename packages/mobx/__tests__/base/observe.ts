import { observable, observe, computed } from "../../src/mobx"

test("observe object and map properties", () => {
    const map = observable.map({ a: 1 })
    const events: any[] = []

    expect(() => observe(map, "b", () => {})).toThrow(
        /the entry 'b' does not exist in the observable map/
    )

    const d1 = observe(map, "a", e => events.push([e.newValue, e.oldValue]))

    map.set("a", 2)
    map.set("a", 3)
    d1()
    map.set("a", 4)

    const o = observable({ a: 5 })

    expect(() => observe(o, "b" as any, () => {})).toThrow(
        /no observable property 'b' found on the observable object/
    )
    const d2 = observe(o, "a", e => events.push([e.newValue, e.oldValue]))

    o.a = 6
    o.a = 7
    d2()
    o.a = 8

    expect(events).toEqual([
        [2, 1],
        [3, 2],
        [6, 5],
        [7, 6]
    ])
})

test("observe computed values", () => {
    const events: any[] = []

    const v = observable.box(0)
    const f = observable.box(0)
    const c = computed(() => v.get())

    observe(c, e => {
        v.get()
        f.get()
        events.push([e.newValue, e.oldValue])
    })

    v.set(6)
    f.set(10)

    expect(events).toEqual([[6, 0]])
})

test("observe disposers unregister the right listener, in any order", () => {
    const arr = observable.array<number>([])
    const calls: number[] = []
    const d1 = observe(arr, () => calls.push(1))
    const d2 = observe(arr, () => calls.push(2))
    const d3 = observe(arr, () => calls.push(3))

    arr.push(1)
    expect(calls).toEqual([1, 2, 3])

    calls.length = 0
    d2()
    d2() // disposing twice is a no-op
    arr.push(2)
    expect(calls).toEqual([1, 3])

    calls.length = 0
    d3()
    d1()
    arr.push(3)
    expect(calls).toEqual([])

    // registering again after all were disposed works, and old disposers don't affect it
    const d4 = observe(arr, () => calls.push(4))
    d1()
    arr.push(4)
    expect(calls).toEqual([4])
    d4()
    calls.length = 0
    arr.push(5)
    expect(calls).toEqual([])
})

test("observe disposer can be called from within a listener", () => {
    const o = observable({ x: 0 })
    const calls: string[] = []
    const d = observe(o, () => {
        calls.push("a")
        d()
    })
    observe(o, () => calls.push("b"))
    o.x = 1
    o.x = 2
    expect(calls).toEqual(["a", "b", "b"])
})

import { observable, reaction, extendObservable } from "../../src/mobx.ts"

test("should react to key removal (unless reconfiguraing to empty) - 1", () => {
    const events = []
    const x = observable.object({
        y: 1,
        z: 1
    })

    reaction(() => Object.keys(x), keys => events.push(keys.join(",")))

    delete x.y
    expect(events).toEqual(["z"])
})

test("should react to key removal (unless reconfiguraing to empty) - 2", () => {
    const events = []
    const x = observable.object({
        y: 1,
        z: 1
    })

    reaction(() => x.z, v => events.push(v))

    delete x.z
    expect(events).toEqual([undefined])
})

test("should react to key removal (unless reconfiguraing to empty) - 2", () => {
    const events = []
    const x = observable.object({
        y: 1,
        z: undefined
    })

    reaction(() => x.z, v => events.push(v))

    delete x.z
    expect(events).toEqual([])
})

test("should react to future key additions - 1", () => {
    const events = []
    const x = observable.object({})

    reaction(() => Object.keys(x), keys => events.push(keys.join(",")))

    x.y = undefined
    expect(events).toEqual(["y"])
})

test("should react to future key additions - 2", () => {
    const events = []
    const x = observable.object({})

    reaction(() => x.z, v => events.push(v))

    x.z = undefined
    expect(events).toEqual([undefined])
    x.y = 3
    expect(events).toEqual([undefined])
    delete x.y
    expect(events).toEqual([undefined])
    x.z = 4
    expect(events).toEqual([undefined, 4])
})

test("should throw clear warning if trying to add computed to already reserved key", () => {
    const x = observable.object({})

    reaction(() => x.z, v => events.push(v))
    expect(() => {
        extendObservable(x, {
            get z() {
                return 3
            }
        })
    }).toThrow(/bla/)
})

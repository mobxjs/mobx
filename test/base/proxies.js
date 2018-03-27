import { observable, reaction, extendObservable, keys } from "../../src/mobx.ts"

test("should react to key removal (unless reconfiguraing to empty) - 1", () => {
    const events = []
    const x = observable.object({
        y: 1,
        z: 1
    })

    reaction(() => Object.keys(x), keys => events.push(keys.join(",")), { fireImmediately: true })
    expect(events).toEqual(["y,z"])
    delete x.y
    expect(events).toEqual(["y,z", "z"])
    // should not trigger another time..
    delete x.y
    expect(events).toEqual(["y,z", "z"])
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

test("correct keys are reported", () => {
    const x = observable.object({
        x: 1,
        get y() {
            return 2
        }
    })
    x.z = 3
    extendObservable(x, {
        a: 4,
        get b() {
            return 5
        }
    })

    expect(Object.keys(x)).toEqual(["x", "z", "a"])
    expect(Object.values(x)).toEqual([1, 3, 4])
    expect(Object.entries(x)).toEqual([["x", 1], ["z", 3], ["a", 4]])

    expect(Object.getOwnPropertyNames(x)).toEqual(["x", "y", "z", "a", "b"])
    expect(keys(x)).toEqual(["x", "z", "a"])

    delete x.x
    expect(Object.keys(x)).toEqual(["z", "a"])
    expect(Object.getOwnPropertyNames(x)).toEqual(["y", "z", "a", "b"])
    expect(keys(x)).toEqual(["z", "a"])
})

test("in operator", () => {
    const x = observable.object({
        x: 1,
        get y() {
            return 2
        }
    })
    x.z = 3
    extendObservable(x, {
        a: 4,
        get b() {
            return 5
        }
    })
    expect("a" in x).toBeTruthy()
    expect("b" in x).toBeTruthy()
    expect("x" in x).toBeTruthy()
    expect("y" in x).toBeTruthy()
    expect("z" in x).toBeTruthy()
    expect("c" in x).toBeFalsy()
    expect("c" in x).toBeFalsy() // not accidentally create
    delete x.x
    expect("x" in x).toBeFalsy()
})

test("for-in operator", () => {
    const x = observable.object({
        x: 1,
        get y() {
            return 2
        }
    })
    x.z = 3
    extendObservable(x, {
        a: 4,
        get b() {
            return 5
        }
    })

    function computeKeys() {
        const res = []
        for (let key in x) res.push(key)
        return res
    }

    expect(computeKeys(x)).toEqual(["x", "z", "a"])
    delete x.x
    expect(computeKeys(x)).toEqual(["z", "a"])
})

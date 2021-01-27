import {
    computed,
    isComputedProp,
    isAction,
    isObservableProp,
    autorun,
    observable,
    action,
    reaction,
    extendObservable,
    keys,
    makeObservable
} from "../../../src/mobx"

import { stripAdminFromDescriptors } from "../utils/test-utils"

test("should react to key removal (unless reconfiguraing to empty) - 1", () => {
    const events = []
    const x = observable.object({
        y: 1,
        z: 1
    })

    reaction(
        () => Object.keys(x),
        keys => events.push(keys.join(",")),
        { fireImmediately: true }
    )
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

    reaction(
        () => x.z,
        v => events.push(v)
    )

    delete x.z
    expect(events).toEqual([undefined])
})

test("should react to key removal (unless reconfiguraing to empty) - 2", () => {
    const events = []
    const x = observable.object({
        y: 1,
        z: undefined
    })

    reaction(
        () => x.z,
        v => events.push(v)
    )

    delete x.z
    expect(events).toEqual([])
})

test("should react to future key additions - 1", () => {
    const events = []
    const x = observable.object({})

    reaction(
        () => Object.keys(x),
        keys => events.push(keys.join(","))
    )

    x.y = undefined
    expect(events).toEqual(["y"])
})

test("should react to future key additions - 2", () => {
    const events = []
    const x = observable.object({})

    reaction(
        () => {
            return x.z
        },
        v => {
            events.push(v)
        }
    )

    x.z = undefined
    expect(Object.keys(x)).toEqual(["z"])
    x.y = 3
    expect(events).toEqual([])
    delete x.y
    expect(events).toEqual([])
    x.z = 4
    expect(events).toEqual([4])
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
    x.y
    x.b // make sure it is read

    expect(Object.keys(x)).toEqual(["x", "z", "a"])
    expect(Object.values(x)).toEqual([1, 3, 4])
    expect(Object.entries(x)).toEqual([
        ["x", 1],
        ["z", 3],
        ["a", 4]
    ])

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
    expect("x" in x).toBeTruthy()
    expect("y" in x).toBeTruthy()
    expect("a" in x).toBeTruthy()
    expect("b" in x).toBeTruthy()
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

test("type coercion doesn't break", () => {
    const x = observable({})
    expect("" + x).toBe("[object Object]")
    expect(42 * x).toBeNaN()
})

test("adding a different key doesn't trigger a pending key", () => {
    const x = observable({})
    let counter = 0

    const d = autorun(() => {
        x.x
        counter++
    })
    expect(counter).toBe(1)

    x.y = 3
    expect(counter).toBe(1)

    x.x = 3
    expect(counter).toBe(2)

    d()
})

test("proxy false reverts to original behavior", () => {
    const x = observable({ x: 3 }, {}, { proxy: false })
    x.y = 3
    expect(isObservableProp(x, "x")).toBe(true)
    expect(isObservableProp(x, "y")).toBe(false)
})

test("ownKeys invariant not broken - 1", () => {
    const a = observable({ x: 3, get y() {} })
    expect(() => {
        Object.freeze(a)
    }).toThrow("cannot be frozen")
})

test("ownKeys invariant not broken - 2", () => {
    const a = observable([2])
    expect(() => {
        Object.freeze(a)
    }).toThrow("cannot be frozen")
})

test("non-proxied object", () => {
    const a = observable({ x: 3 }, {}, { proxy: false })
    a.b = 4
    extendObservable(
        a,
        {
            double() {
                this.x = this.x * 2
            },
            get y() {
                return this.x * 2
            }
        },
        {
            double: action
        }
    )

    expect(a.y).toBe(6)
    a.double()
    expect(a.y).toBe(12)
    expect(isComputedProp(a, "y")).toBe(true)
    expect(isAction(a.double)).toBe(true)
    expect(stripAdminFromDescriptors(Object.getOwnPropertyDescriptors(a))).toMatchSnapshot()
    expect(Object.keys(a)).toEqual(["x", "b"])
})

test("extend proxies", () => {
    const a = observable({ x: 3 })
    a.b = 4
    extendObservable(
        a,
        {
            double() {
                this.x = this.x * 2
            },
            get y() {
                return this.x * 2
            }
        },
        {
            double: action
        }
    )

    expect(a.y).toBe(6)
    a.double()
    expect(a.y).toBe(12)
    expect(isComputedProp(a, "y")).toBe(true)
    expect(isAction(a.double)).toBe(true)
    expect(stripAdminFromDescriptors(Object.getOwnPropertyDescriptors(a))).toMatchSnapshot()
    expect(Object.keys(a)).toEqual(["x", "b"])
})

test("decorate proxies", () => {
    const a = observable({ x: 3 })
    a.b = 4
    extendObservable(
        a,
        {
            double() {
                this.x = this.x * 2
            },
            get y() {
                return this.x * 2
            }
        },
        {
            double: action
        }
    )

    expect(a.y).toBe(6)
    a.double()
    expect(a.y).toBe(12)
    expect(isComputedProp(a, "y")).toBe(true)
    expect(isAction(a.double)).toBe(true)
    expect(stripAdminFromDescriptors(Object.getOwnPropertyDescriptors(a))).toMatchSnapshot()
    expect(Object.keys(a)).toEqual(["x", "b"])
})

test("predictable 'this' - 1", () => {
    const a = observable.object(
        {
            a0() {
                return this
            },
            a1() {
                return this
            },
            a2() {
                return this
            },
            get computed() {
                return this
            }
        },
        {
            a1: action,
            a2: action.bound
        }
    )

    expect(a.a0()).toBe(a)
    expect(a.a1()).toBe(a)
    expect(a.a2()).toBe(a) // pre-bound!
    expect(a.computed).toBe(a)
})

test("predictable 'this' - 2", () => {
    class A {
        constructor() {
            makeObservable(this, {
                a1: action,
                a2: action.bound,
                computed: computed
            })
        }

        a0() {
            return this
        }

        a1() {
            return this
        }

        a2() {
            return this
        }

        get computed() {
            return this
        }
    }

    const a = new A()

    expect(a.a0()).toBe(a)
    expect(a.a1()).toBe(a)
    expect(a.a2()).toBe(a)
    expect(a.computed).toBe(a)
})

test("1796 - delete -> recreate observable prop", () => {
    let value = observable({
        foo: undefined // if foo is something like 'abc', it works.
    })

    const events = []

    autorun(() => {
        events.push(value.foo)
    })
    delete value.foo
    value.foo = "def"
    expect(events).toEqual([
        undefined,
        undefined, // ideally  not, but ok..
        "def"
    ])
})

test("1796 - delete -> recreate computed prop", () => {
    let value = observable({
        foo: undefined,
        get bar() {
            return this.foo
        }
    })

    expect(isComputedProp(value, "bar")).toBe(true)

    const events = []

    autorun(() => {
        events.push(value.bar)
    })
    delete value.bar
    value.bar = "def"
    expect(isObservableProp(value, "bar")).toBe(true)
    expect(isComputedProp(value, "bar")).toBe(false)

    expect(events).toEqual([undefined, undefined, "def"])
})

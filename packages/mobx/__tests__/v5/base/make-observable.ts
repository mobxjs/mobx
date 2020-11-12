import {
    makeObservable,
    action,
    computed,
    observable,
    isObservable,
    isObservableObject,
    isObservableProp,
    isComputedProp,
    isAction,
    makeAutoObservable,
    autorun,
    extendObservable,
    getDebugName
} from "../../../src/mobx"
import { mobxDecoratorsSymbol, configure } from "../../../src/internal"

test("makeObservable picks up decorators", () => {
    class Test {
        @observable x = 3
        y = 3

        @computed
        get double() {
            return this.x * 2
        }

        @action
        unbound() {
            return this
        }

        @action.bound bound() {
            return this
        }

        constructor() {
            makeObservable(this)
        }
    }

    const t = new Test()
    expect(isObservableObject(t)).toBe(true)
    expect(isObservableProp(t, "x")).toBe(true)
    expect(isObservableProp(t, "y")).toBe(false)
    expect(isComputedProp(t, "double")).toBe(true)
    expect(isAction(t.unbound)).toBe(true)
    expect(isAction(t.bound)).toBe(true)
    expect(t.unbound.call(undefined)).toBe(undefined)
    expect(t.bound.call(undefined)).toBe(t)
})

test("makeObservable picks up annotations", () => {
    class Test {
        x = 3
        y = 2

        get double() {
            return this.x * 2
        }

        unbound() {
            return this
        }

        bound() {
            return this
        }

        constructor() {
            makeObservable(this, {
                x: observable,
                double: computed,
                unbound: action,
                bound: action.bound
            })
        }
    }

    const t = new Test()
    expect(isObservableObject(t)).toBe(true)
    expect(isObservableProp(t, "x")).toBe(true)
    expect(isObservableProp(t, "y")).toBe(false)

    expect(isComputedProp(t, "double")).toBe(true)
    expect(isAction(t.unbound)).toBe(true)
    expect(isAction(t.bound)).toBe(true)
    expect(t.unbound.call(undefined)).toBe(undefined)
    expect(t.bound.call(undefined)).toBe(t)
})

test("makeObservable supports private fields", () => {
    class Test {
        private x = 3
        private y = 2

        private get double() {
            return this.x * 2
        }

        private unbound() {
            return this
        }

        private bound() {
            return this
        }

        constructor() {
            makeObservable<this, "x" | "double" | "unbound" | "bound">(this, {
                x: observable,
                double: computed,
                unbound: action,
                bound: action.bound
            })
            if (3 - 1 === 4) {
                makeObservable<this, "x" | "double" | "unbound" | "bound">(this, {
                    // @ts-expect-error
                    z: false
                })

                makeObservable(this, {
                    // @ts-expect-error
                    z: false
                })
            }
        }
    }

    const t: any = new Test()
    expect(isObservableObject(t)).toBe(true)
    expect(isObservableProp(t, "x")).toBe(true)
    expect(isObservableProp(t, "y")).toBe(false)

    expect(isComputedProp(t, "double")).toBe(true)
    expect(isAction(t.unbound)).toBe(true)
    expect(isAction(t.bound)).toBe(true)
    expect(t.unbound.call(undefined)).toBe(undefined)
    expect(t.bound.call(undefined)).toBe(t)
})

test("makeObservable has sane defaults", () => {
    class Test {
        x = 3
        y = 2

        get double() {
            return this.x * 2
        }

        unbound() {
            return this
        }

        bound() {
            return this
        }

        constructor() {
            makeObservable(this, {
                x: true,
                y: false,
                double: true,
                unbound: true,
                bound: action.bound
            })
            if (3 - 1 === 4) {
                makeObservable(this, {
                    x: false,
                    // @ts-expect-error
                    z: true
                })
            }
        }
    }

    const t = new Test()
    expect(isObservableObject(t)).toBe(true)
    expect(isObservableProp(t, "x")).toBe(true)
    expect(isObservableProp(t, "y")).toBe(false)

    expect(isComputedProp(t, "double")).toBe(true)
    expect(isAction(t.unbound)).toBe(true)
    expect(isAction(t.bound)).toBe(true)
    expect(t.unbound.call(undefined)).toBe(undefined)
    expect(t.bound.call(undefined)).toBe(t)
})

test("makeObservable supports autoBind", () => {
    class Test {
        unbound() {
            return this
        }

        bound() {
            return this
        }

        constructor() {
            makeObservable(
                this,
                {
                    unbound: action,
                    bound: true
                },
                {
                    autoBind: true
                }
            )
        }
    }

    const t = new Test()
    expect(isObservableObject(t)).toBe(true)
    expect(isAction(t.unbound)).toBe(true)
    expect(isAction(t.bound)).toBe(true)
    expect(t.unbound.call(undefined)).toBe(undefined)
    expect(t.bound.call(undefined)).toBe(t)
})

test("makeAutoObservable has sane defaults", () => {
    class Test {
        x = 3
        y = 2

        get double() {
            return this.x * 2
        }

        unbound() {
            return this
        }

        bound() {
            return this
        }

        constructor() {
            makeAutoObservable(this)
        }
    }

    const t = new Test()
    expect(isObservableObject(t)).toBe(true)
    expect(isObservableProp(t, "x")).toBe(true)
    expect(isObservableProp(t, "y")).toBe(true) // will be observable

    expect(isComputedProp(t, "double")).toBe(true)
    expect(isAction(t.unbound)).toBe(true)
    expect(isAction(t.bound)).toBe(true)
    expect(t.unbound.call(undefined)).toBe(undefined)
    expect(t.bound.call(undefined)).toBe(undefined)
})

test("makeAutoObservable supports autoBind", () => {
    class Test {
        unbound() {
            return this
        }

        bound() {
            return this
        }

        constructor() {
            makeAutoObservable(
                this,
                {
                    unbound: false
                },
                { autoBind: true }
            )
        }
    }

    const t = new Test()
    expect(isObservableObject(t)).toBe(true)
    expect(isAction(t.unbound)).toBe(false)
    expect(isAction(t.bound)).toBe(true)
    expect(t.unbound.call(undefined)).toBe(undefined)
    expect(t.bound.call(undefined)).toBe(t)
})

test("makeAutoObservable allows overrides", () => {
    class Test {
        x = 3
        y = 2

        get double() {
            return this.x * 2
        }

        unbound() {
            return this
        }

        bound() {
            return this
        }

        constructor() {
            makeAutoObservable(this, {
                unbound: true,
                bound: action.bound,
                y: false
            })
            if (3 - 1 === 4) {
                makeObservable(this, {
                    // @ts-expect-error
                    z: true
                })
            }
        }
    }

    const t = new Test()
    expect(isObservableObject(t)).toBe(true)
    expect(isObservableProp(t, "x")).toBe(true)
    expect(isObservableProp(t, "y")).toBe(false)

    expect(isComputedProp(t, "double")).toBe(true)
    expect(isAction(t.unbound)).toBe(true)
    expect(isAction(t.bound)).toBe(true)
    expect(t.unbound.call(undefined)).toBe(undefined)
    expect(t.bound.call(undefined)).toBe(t)
})

test("makeAutoObservable cannot be used on subclasses", () => {
    class A {}

    class B extends A {
        constructor() {
            super()
            makeAutoObservable(this)
        }
    }

    expect(() => {
        new B()
    }).toThrowErrorMatchingInlineSnapshot(
        `"[MobX] 'makeAutoObservable' can only be used for classes that don't have a superclass"`
    )
})

test("makeAutoObservable cannot be used on observable objects", () => {
    expect(() => {
        makeAutoObservable(observable({ x: 3 }))
    }).toThrowErrorMatchingInlineSnapshot(
        `"[MobX] makeAutoObservable can only be used on objects not already made observable"`
    )
})

test("makeAutoObservable actions can be used for state updaters and state readers", () => {
    class A {
        x = 1

        constructor() {
            makeAutoObservable(this)
        }

        double() {
            return this.x * 2
        }

        addTwo() {
            this.x++
            this.x++
        }
    }

    const events: number[] = []
    const a = new A()
    const d = autorun(() => {
        events.push(a.double())
    })

    a.addTwo()

    // tracked and batched!
    expect(events).toEqual([2, 6])

    d()
})

test("observable actions can be used for state updaters and state readers", () => {
    const events: number[] = []
    const a = observable({
        x: 1,
        double() {
            return this.x * 2
        },
        addTwo() {
            this.x++
            this.x++
        }
    })
    const d = autorun(() => {
        events.push(a.double())
    })

    a.addTwo()

    // tracked and batched!
    expect(events).toEqual([2, 6])

    d()
})

test("makeObservable can be used late and support non-enumerable getters", () => {
    function MyClass() {
        this.x = 1
        Object.defineProperty(this, "double", {
            get() {
                return this.x
            },
            configurable: true,
            enumerable: false
        })
        this.inc = function () {
            this.x++
        }
        makeObservable(this, {
            x: observable,
            double: computed,
            inc: action
        })
    }
    const i = new MyClass()

    expect(isObservableProp(i, "x")).toBe(true)
    expect(isComputedProp(i, "double")).toBe(true)
    expect(isAction(i.inc)).toBe(true)
})

test("makeAutoObservable can be used late and support non-enumerable getters", () => {
    function MyClass() {
        this.x = 1
        Object.defineProperty(this, "double", {
            get() {
                return this.x
            },
            configurable: true,
            enumerable: false
        })
        this.inc = function () {
            this.x++
        }
        makeAutoObservable(this)
    }
    // check if annotations are cached
    expect(Object.getOwnPropertySymbols(MyClass.prototype).length).toBe(0)
    const x = new MyClass()
    expect(Object.getOwnPropertySymbols(MyClass.prototype).length).toBe(1)

    const i = new MyClass()

    expect(isObservableProp(i, "x")).toBe(true)
    expect(isComputedProp(i, "double")).toBe(true)
    expect(isAction(i.inc)).toBe(true)
})

test("extendObservable can be used late and support non-enumerable getters #2386", () => {
    function MyClass() {
        const args = {
            x: 1,
            inc() {
                this.x++
            }
        }
        Object.defineProperty(args, "double", {
            get() {
                return this.x
            },
            enumerable: false
        })
        extendObservable(this, args)
    }
    const i = new MyClass()

    expect(isObservableProp(i, "x")).toBe(true)
    expect(isComputedProp(i, "double")).toBe(true)
    expect(isAction(i.inc)).toBe(true)
})

test("makeObservable doesn't trigger in always mode'", () => {
    configure({
        enforceActions: "always"
    })
    class C {
        x = 3
        constructor() {
            makeAutoObservable(this)
        }
    }

    expect(new C()).toBeTruthy()
})

test("#2457", () => {
    class BaseClass {
        @observable
        value1?: number

        constructor() {
            makeObservable(this)
        }
    }

    class SubClass extends BaseClass {
        constructor() {
            super()
            makeObservable(this)
        }

        @computed
        get value1Computed() {
            return this.value1
        }
    }

    const t = new SubClass()
    expect(isObservableObject(t)).toBe(true)
    expect(isObservableProp(t, "value1")).toBe(true)
    expect(isComputedProp(t, "value1Computed")).toBe(true)
})

test("makeAutoObservable respects options.deep #2542'", () => {
    const o = makeAutoObservable({ nested: {} }, {}, { deep: false })
    expect(isObservable(o)).toBe(true)
    expect(isObservableProp(o, "nested")).toBe(true)
    expect(isObservable(o.nested)).toBe(false)

    const deepO = makeAutoObservable({ nested: {} }, {}, { deep: true })
    expect(isObservable(deepO)).toBe(true)
    expect(isObservableProp(deepO, "nested")).toBe(true)
    expect(isObservable(deepO.nested)).toBe(true)
})

test("makeObservable respects options.name #2614'", () => {
    const name = "DebugName"

    class Clazz {
        timer = 0
        constructor() {
            makeObservable(this, { timer: observable }, { name })
        }
    }

    const instance = new Clazz()
    const plain = makeObservable({ timer: 0 }, { timer: observable }, { name })

    expect(getDebugName(instance)).toBe(name)
    expect(getDebugName(plain)).toBe(name)
})

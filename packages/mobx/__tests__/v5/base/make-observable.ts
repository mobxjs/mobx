import { isFlow } from "../../../src/api/flow"
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
    getDebugName,
    _getAdministration,
    configure,
    flow,
    override
} from "../../../src/mobx"

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

    expect(isObservableProp(a, "x")).toBe(true)
    expect(isAction(a.double)).toBe(true)
    expect(isAction(a.addTwo)).toBe(true)

    const d = autorun(() => {
        events.push(a.double())
    })

    a.addTwo()

    expect(a.x).toBe(3)

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

    expect(isObservableProp(a, "x")).toBe(true)
    expect(isAction(a.double)).toBe(true)
    expect(isAction(a.addTwo)).toBe(true)

    a.addTwo()

    expect(a.x).toBe(3)

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
// "makeObservable + @action + arrow function + subclass override #2614"

test("class - annotations", () => {
    class Foo {
        ["observable"] = { nested: {} };
        ["observable.ref"] = { nested: {} };
        ["observable.shallow"] = { nested: {} }

        constructor() {
            makeObservable(this, {
                // @ts-ignore
                observable: observable,
                // @ts-ignore
                "observable.ref": observable.ref,
                // @ts-ignore
                "observable.shallow": observable.shallow,
                // @ts-ignore
                computed: computed,
                // @ts-ignore
                action: action,
                // @ts-ignore
                "action.bound": action.bound,
                // @ts-ignore
                flow: flow
            })
        }

        get computed() {
            return this
        }

        ["action"]() {
            return this
        }

        ["action.bound"]() {
            return this
        }

        *["flow"]() {
            return this
        }
    }

    const foo = new Foo()
    expect(isObservableObject(foo)).toBe(true)

    expect(isObservableProp(foo, "observable")).toBe(true)
    expect(isObservableObject(foo["observable"])).toBe(true)

    expect(isObservableProp(foo, "observable.ref")).toBe(true)
    expect(isObservableObject(foo["observable.ref"])).toBe(false)
    expect(isObservableObject(foo["observable.ref"].nested)).toBe(false)

    expect(isObservableProp(foo, "observable.shallow")).toBe(true)
    expect(isObservableObject(foo["observable.shallow"])).toBe(true)
    expect(isObservableObject(foo["observable.shallow"].nested)).toBe(false)

    expect(isComputedProp(foo, "computed")).toBe(true)

    expect(isAction(foo["action"])).toBe(true)
    expect(Object.getPrototypeOf(foo).hasOwnProperty("action")).toBe(true)
    expect(foo.hasOwnProperty("action")).toBe(false)
    expect(foo["action"].call(null)).toBe(null)

    expect(isAction(foo["action.bound"])).toBe(true)
    expect(Object.getPrototypeOf(foo).hasOwnProperty("action.bound")).toBe(true)
    expect(foo.hasOwnProperty("action.bound")).toBe(true)
    expect(foo["action.bound"].call(null)).toBe(foo)

    expect(isFlow(foo["flow"])).toBe(true)
    expect(Object.getPrototypeOf(foo).hasOwnProperty("flow")).toBe(true)
    expect(foo.hasOwnProperty("flow")).toBe(false)
})

test("class - decorators", () => {
    class Foo {
        @observable
        ["observable"] = { nested: {} };
        @observable.ref
        ["observable.ref"] = { nested: {} };
        @observable.shallow
        ["observable.shallow"] = { nested: {} }

        constructor() {
            makeObservable(this)
        }

        @computed
        get computed() {
            return this
        }

        @action
        ["action"]() {
            return this
        }

        @action.bound
        ["action.bound"]() {
            return this
        }

        @flow
        *["flow"]() {
            return this
        }
    }

    const foo = new Foo()
    expect(isObservableObject(foo)).toBe(true)

    expect(isObservableProp(foo, "observable")).toBe(true)
    expect(isObservableObject(foo["observable"])).toBe(true)

    expect(isObservableProp(foo, "observable.ref")).toBe(true)
    expect(isObservableObject(foo["observable.ref"])).toBe(false)
    expect(isObservableObject(foo["observable.ref"].nested)).toBe(false)

    expect(isObservableProp(foo, "observable.shallow")).toBe(true)
    expect(isObservableObject(foo["observable.shallow"])).toBe(true)
    expect(isObservableObject(foo["observable.shallow"].nested)).toBe(false)

    expect(isComputedProp(foo, "computed")).toBe(true)

    expect(isAction(foo["action"])).toBe(true)
    expect(Object.getPrototypeOf(foo).hasOwnProperty("action")).toBe(true)
    expect(foo.hasOwnProperty("action")).toBe(false)
    expect(foo["action"].call(null)).toBe(null)

    expect(isAction(foo["action.bound"])).toBe(true)
    expect(Object.getPrototypeOf(foo).hasOwnProperty("action.bound")).toBe(true)
    expect(foo.hasOwnProperty("action.bound")).toBe(true)
    expect(foo["action.bound"].call(null)).toBe(foo)

    expect(isFlow(foo["flow"])).toBe(true)
    expect(Object.getPrototypeOf(foo).hasOwnProperty("flow")).toBe(true)
    expect(foo.hasOwnProperty("flow")).toBe(false)
})

test("subclass - annotation", () => {
    class Parent {
        ["observable"] = { nested: {} };
        ["observable.ref"] = { nested: {} };
        ["observable.shallow"] = { nested: {} }

        constructor() {
            makeObservable(this, {
                // @ts-ignore
                observable: observable,
                // @ts-ignore
                "observable.ref": observable.ref,
                // @ts-ignore
                "observable.shallow": observable.shallow,
                // @ts-ignore
                computed: computed,
                // @ts-ignore
                action: action,
                // @ts-ignore
                "action.bound": action.bound,
                // @ts-ignore
                flow: flow
            })
        }

        get computed() {
            return this
        }

        ["action"]() {
            return this
        }

        ["action.bound"]() {
            return this
        }

        *["flow"]() {
            return this
        }
    }

    class Child extends Parent {
        ["observable2"] = { nested: {} };
        ["observable.ref2"] = { nested: {} };
        ["observable.shallow2"] = { nested: {} }

        constructor() {
            super()
            makeObservable(this, {
                // @ts-ignore
                observable2: observable,
                // @ts-ignore
                "observable.ref2": observable.ref,
                // @ts-ignore
                "observable.shallow2": observable.shallow,
                // @ts-ignore
                computed2: computed,
                // @ts-ignore
                action2: action,
                // @ts-ignore
                "action.bound2": action.bound,
                // @ts-ignore
                flow2: flow
            })
        }

        get computed2() {
            return this
        }

        ["action2"]() {
            return this
        }

        ["action.bound2"]() {
            return this
        }

        *["flow2"]() {
            return this
        }
    }

    const child = new Child()
    expect(isObservableObject(child)).toBe(true)

    expect(isObservableProp(child, "observable")).toBe(true)
    expect(isObservableObject(child["observable"])).toBe(true)

    expect(isObservableProp(child, "observable.ref")).toBe(true)
    expect(isObservableObject(child["observable.ref"])).toBe(false)
    expect(isObservableObject(child["observable.ref"].nested)).toBe(false)

    expect(isObservableProp(child, "observable.shallow")).toBe(true)
    expect(isObservableObject(child["observable.shallow"])).toBe(true)
    expect(isObservableObject(child["observable.shallow"].nested)).toBe(false)

    expect(isComputedProp(child, "computed")).toBe(true)

    expect(isAction(child["action"])).toBe(true)
    expect(Object.getPrototypeOf(child).hasOwnProperty("action")).toBe(false)
    expect(child.hasOwnProperty("action")).toBe(false)
    expect(child["action"].call(null)).toBe(null)

    expect(isAction(child["action.bound"])).toBe(true)
    expect(Object.getPrototypeOf(child).hasOwnProperty("action.bound")).toBe(false)
    expect(child.hasOwnProperty("action.bound")).toBe(true)
    expect(child["action.bound"].call(null)).toBe(child)

    expect(isFlow(child["flow"])).toBe(true)
    expect(Object.getPrototypeOf(child).hasOwnProperty("flow")).toBe(false)
    expect(child.hasOwnProperty("flow")).toBe(false)

    expect(isObservableProp(child, "observable2")).toBe(true)
    expect(isObservableObject(child["observable2"])).toBe(true)

    expect(isObservableProp(child, "observable.ref2")).toBe(true)
    expect(isObservableObject(child["observable.ref2"])).toBe(false)
    expect(isObservableObject(child["observable.ref2"].nested)).toBe(false)

    expect(isObservableProp(child, "observable.shallow2")).toBe(true)
    expect(isObservableObject(child["observable.shallow2"])).toBe(true)
    expect(isObservableObject(child["observable.shallow2"].nested)).toBe(false)

    expect(isComputedProp(child, "computed2")).toBe(true)

    expect(isAction(child["action2"])).toBe(true)
    expect(Object.getPrototypeOf(child).hasOwnProperty("action2")).toBe(true)
    expect(child.hasOwnProperty("action2")).toBe(false)
    expect(child["action2"].call(null)).toBe(null)

    expect(isAction(child["action.bound2"])).toBe(true)
    expect(Object.getPrototypeOf(child).hasOwnProperty("action.bound2")).toBe(true)
    expect(child.hasOwnProperty("action.bound2")).toBe(true)
    expect(child["action.bound2"].call(null)).toBe(child)

    expect(isFlow(child["flow2"])).toBe(true)
    expect(Object.getPrototypeOf(child).hasOwnProperty("flow2")).toBe(true)
    expect(child.hasOwnProperty("flow2")).toBe(false)
})

test("subclass - decorator", () => {
    class Parent {
        ["observable"] = { nested: {} };
        ["observable.ref"] = { nested: {} };
        ["observable.shallow"] = { nested: {} }

        constructor() {
            makeObservable(this, {
                // @ts-ignore
                observable: observable,
                // @ts-ignore
                "observable.ref": observable.ref,
                // @ts-ignore
                "observable.shallow": observable.shallow,
                // @ts-ignore
                computed: computed,
                // @ts-ignore
                action: action,
                // @ts-ignore
                "action.bound": action.bound,
                // @ts-ignore
                flow: flow
            })
        }

        get computed() {
            return this
        }

        ["action"]() {
            return this
        }

        ["action.bound"]() {
            return this
        }

        *["flow"]() {
            return this
        }
    }

    class Child extends Parent {
        @observable
        ["observable2"] = { nested: {} };
        @observable.ref
        ["observable.ref2"] = { nested: {} };
        @observable.shallow
        ["observable.shallow2"] = { nested: {} }

        constructor() {
            super()
            makeObservable(this)
        }

        @computed
        get computed2() {
            return this
        }

        @action
        ["action2"]() {
            return this
        }

        @action.bound
        ["action.bound2"]() {
            return this
        }

        @flow
        *["flow2"]() {
            return this
        }
    }

    const child = new Child()
    expect(isObservableObject(child)).toBe(true)

    expect(isObservableProp(child, "observable")).toBe(true)
    expect(isObservableObject(child["observable"])).toBe(true)

    expect(isObservableProp(child, "observable.ref")).toBe(true)
    expect(isObservableObject(child["observable.ref"])).toBe(false)
    expect(isObservableObject(child["observable.ref"].nested)).toBe(false)

    expect(isObservableProp(child, "observable.shallow")).toBe(true)
    expect(isObservableObject(child["observable.shallow"])).toBe(true)
    expect(isObservableObject(child["observable.shallow"].nested)).toBe(false)

    expect(isComputedProp(child, "computed")).toBe(true)

    expect(isAction(child["action"])).toBe(true)
    expect(Object.getPrototypeOf(child).hasOwnProperty("action")).toBe(false)
    expect(child.hasOwnProperty("action")).toBe(false)
    expect(child["action"].call(null)).toBe(null)

    expect(isAction(child["action.bound"])).toBe(true)
    expect(Object.getPrototypeOf(child).hasOwnProperty("action.bound")).toBe(false)
    expect(child.hasOwnProperty("action.bound")).toBe(true)
    expect(child["action.bound"].call(null)).toBe(child)

    expect(isFlow(child["flow"])).toBe(true)
    expect(Object.getPrototypeOf(child).hasOwnProperty("flow")).toBe(false)
    expect(child.hasOwnProperty("flow")).toBe(false)

    expect(isObservableProp(child, "observable2")).toBe(true)
    expect(isObservableObject(child["observable2"])).toBe(true)

    expect(isObservableProp(child, "observable.ref2")).toBe(true)
    expect(isObservableObject(child["observable.ref2"])).toBe(false)
    expect(isObservableObject(child["observable.ref2"].nested)).toBe(false)

    expect(isObservableProp(child, "observable.shallow2")).toBe(true)
    expect(isObservableObject(child["observable.shallow2"])).toBe(true)
    expect(isObservableObject(child["observable.shallow2"].nested)).toBe(false)

    expect(isComputedProp(child, "computed2")).toBe(true)

    expect(isAction(child["action2"])).toBe(true)
    expect(Object.getPrototypeOf(child).hasOwnProperty("action2")).toBe(true)
    expect(child.hasOwnProperty("action2")).toBe(false)
    expect(child["action2"].call(null)).toBe(null)

    expect(isAction(child["action.bound2"])).toBe(true)
    expect(Object.getPrototypeOf(child).hasOwnProperty("action.bound2")).toBe(true)
    expect(child.hasOwnProperty("action.bound2")).toBe(true)
    expect(child["action.bound2"].call(null)).toBe(child)

    expect(isFlow(child["flow2"])).toBe(true)
    expect(Object.getPrototypeOf(child).hasOwnProperty("flow2")).toBe(true)
    expect(child.hasOwnProperty("flow2")).toBe(false)
})

test("subclass - annotation - override", async () => {
    class Parent {
        constructor() {
            makeObservable(this, {
                action: action,
                ["action.bound"]: action.bound,
                computed: computed,
                flow: flow
            })
        }
        action() {
            return "parent"
        }
        ["action.bound"]() {
            return "parent"
        }
        *flow() {
            return "parent"
        }
        get computed() {
            return "parent"
        }
    }

    class Child extends Parent {
        action() {
            return "child of " + super.action()
        }
        ["action.bound"]() {
            return "child of " + super["action.bound"]()
        }
        get computed() {
            return "child"
        }
        // @ts-ignore
        *flow() {
            const parent = yield super.flow()
            return "child of " + parent
        }
    }
    const child = new Child()

    // Action
    expect(isAction(Parent.prototype.action)).toBe(true)
    expect(isAction(Child.prototype.action)).toBe(true)
    expect(isAction(child.action)).toBe(true)

    expect(child.hasOwnProperty("action")).toBe(false)

    expect(Parent.prototype.action()).toBe("parent")
    expect(Child.prototype.action()).toBe("child of parent")
    expect(child.action()).toBe("child of parent")
    // Action bound
    expect(isAction(Parent.prototype["action.bound"])).toBe(true)
    expect(isAction(Child.prototype["action.bound"])).toBe(true)
    expect(isAction(child["action.bound"])).toBe(true)

    expect(child.hasOwnProperty("action.bound")).toBe(true)

    expect(Parent.prototype["action.bound"]()).toBe("parent")
    expect(Child.prototype["action.bound"]()).toBe("child of parent")
    expect(child["action.bound"]()).toBe("child of parent")
    // Computed
    expect(isComputedProp(child, "computed")).toBe(true)
    expect(child.computed).toBe("child")
    // Flow
    expect(isFlow(Parent.prototype.flow)).toBe(true)
    expect(isFlow(Child.prototype.flow)).toBe(true)
    expect(isFlow(child.flow)).toBe(true)

    expect(child.hasOwnProperty("flow")).toBe(false)

    expect(await Parent.prototype.flow()).toBe("parent")
    expect(await Child.prototype.flow()).toBe("child of parent")
    expect(await child["action.bound"]()).toBe("child of parent")
})

test("subclass - decorator - override", async () => {
    class Parent {
        constructor() {
            makeObservable(this)
        }
        @action
        action() {
            return "parent"
        }
        @action.bound
        ["action.bound"]() {
            return "parent"
        }
        @flow
        *flow() {
            return "parent"
        }
        @computed
        get computed() {
            return "parent"
        }
    }

    class Child extends Parent {
        action() {
            return "child of " + super.action()
        }
        ["action.bound"]() {
            return "child of " + super["action.bound"]()
        }
        get computed() {
            return "child"
        }
        // @ts-ignore
        *flow() {
            const parent = yield super.flow()
            return "child of " + parent
        }
    }
    const child = new Child()

    // Action
    expect(isAction(Parent.prototype.action)).toBe(true)
    expect(isAction(Child.prototype.action)).toBe(true)
    expect(isAction(child.action)).toBe(true)

    expect(child.hasOwnProperty("action")).toBe(false)

    expect(Parent.prototype.action()).toBe("parent")
    expect(Child.prototype.action()).toBe("child of parent")
    expect(child.action()).toBe("child of parent")
    // Action bound
    expect(isAction(Parent.prototype["action.bound"])).toBe(true)
    expect(isAction(Child.prototype["action.bound"])).toBe(true)
    expect(isAction(child["action.bound"])).toBe(true)

    expect(child.hasOwnProperty("action.bound")).toBe(true)

    expect(Parent.prototype["action.bound"]()).toBe("parent")
    expect(Child.prototype["action.bound"]()).toBe("child of parent")
    expect(child["action.bound"]()).toBe("child of parent")
    // Computed
    expect(isComputedProp(child, "computed")).toBe(true)
    expect(child.computed).toBe("child")
    // Flow
    expect(isFlow(Parent.prototype.flow)).toBe(true)
    expect(isFlow(Child.prototype.flow)).toBe(true)
    expect(isFlow(child.flow)).toBe(true)

    expect(child.hasOwnProperty("flow")).toBe(false)

    expect(await Parent.prototype.flow()).toBe("parent")
    expect(await Child.prototype.flow()).toBe("child of parent")
    expect(await child["action.bound"]()).toBe("child of parent")
})

test("subclass - cannot re-annotate", () => {
    class Parent {
        observable = 1
        constructor() {
            makeObservable(this, {
                action: action,
                observable: observable,
                actionBound: action.bound,
                computed: computed
            })
        }
        action() {}
        actionBound() {}
        get computed() {
            return this
        }
    }

    class ChildAction extends Parent {
        constructor() {
            super()
            makeObservable(this, {
                action: action
            })
        }
        action() {}
    }

    class ChildActionBound extends Parent {
        constructor() {
            super()
            makeObservable(this, {
                actionBound: action.bound
            })
        }
        actionBound() {}
    }

    class ChildObservable extends Parent {
        constructor() {
            super()
            this.observable = 2
            makeObservable(this, {
                observable: observable
            })
        }
    }

    class ChildComputed extends Parent {
        constructor() {
            super()
            makeObservable(this, {
                computed: computed
            })
        }
        get computed() {
            return this
        }
    }

    expect(() => new ChildAction()).toThrow(/^\[MobX\] Cannot apply/)
    expect(() => new ChildActionBound()).toThrow(/^\[MobX\] Cannot apply/)
    expect(() => new ChildObservable()).toThrow(/^\[MobX\] Cannot apply/)
    expect(() => new ChildComputed()).toThrow(/^\[MobX\] Cannot apply/)
})

test("subclass - cannot re-decorate", () => {
    class Parent {
        @observable
        observable = 1
        constructor() {
            makeObservable(this)
        }
        @action
        action() {}
        @action.bound
        actionBound() {}
        @computed
        get computed() {
            return this
        }
    }

    expect(() => {
        class ChildAction extends Parent {
            constructor() {
                super()
                makeObservable(this)
            }
            @action
            action() {}
        }
    }).toThrow(/^\[MobX\] Cannot apply/)

    expect(() => {
        class ChildActionBound extends Parent {
            constructor() {
                super()
                makeObservable(this)
            }
            @action.bound
            actionBound() {}
        }
    }).toThrow(/^\[MobX\] Cannot apply/)

    expect(() => {
        class ChildObservable extends Parent {
            @observable
            observable = 1
            constructor() {
                super()
                makeObservable(this)
            }
        }
    }).toThrow(/^\[MobX\] Cannot apply/)

    expect(() => {
        class ChildComputed extends Parent {
            constructor() {
                super()
                makeObservable(this)
            }
            @computed
            get computed() {
                return this
            }
        }
    }).toThrow(/^\[MobX\] Cannot apply/)
})

test("subclass - cannot redefine property", () => {
    class Parent {
        observable = 1
        constructor() {
            makeObservable(this, {
                observable: observable,
                action: action,
                computed: computed
            })
        }
        action = () => {}
        get computed() {
            return this
        }
    }

    class ChildAction extends Parent {
        action = () => {}
    }

    class ChildObservable extends Parent {
        observable = 2
    }

    class ChildComputed extends Parent {
        // @ts-ignore
        computed = "foo"
    }

    expect(() => new ChildAction()).toThrow(/^Cannot redefine property/)
    expect(() => new ChildObservable()).toThrow(/^Cannot redefine property/)
    expect(() => new ChildComputed()).toThrow(/^Cannot redefine property/)
})

test("@override", () => {
    // TODO computed + action.bound
    class Parent {
        constructor() {
            makeObservable(this)
        }

        @action
        action() {
            return "parent"
        }
    }

    class Child extends Parent {
        @override
        action() {
            return `child of ${super.action()}`
        }
    }

    const child = new Child()
    expect(isAction(Parent.prototype.action))
    expect(Parent.prototype.action()).toBe("parent")
    expect(isAction(Child.prototype.action))
    expect(isAction(child.action)).toBe(true)
    expect(child.action()).toBe("child of parent")
})

test("@override must override", () => {
    expect(() => {
        class Parent {
            constructor() {
                makeObservable(this)
            }

            action() {
                return "parent"
            }
        }

        class Child extends Parent {
            @override
            action() {
                return `child of ${super.action()}`
            }
        }
    }).toThrow(
        /^\[MobX\] 'Child.action' is decorated with 'override', but no such decorated member was found on prototype\./
    )
})

test("override", () => {
    class Parent {
        constructor() {
            makeObservable(this, {
                action: action
            })
        }
        action() {
            return "parent"
        }
    }

    class Child extends Parent {
        constructor() {
            super()
            makeObservable(this, {
                action: override
            })
        }
        action() {
            return `child of ${super.action()}`
        }
    }

    const child = new Child()
    expect(isAction(Parent.prototype.action))
    expect(Parent.prototype.action()).toBe("parent")
    expect(isAction(Child.prototype.action))
    expect(isAction(child.action)).toBe(true)

    expect(child.action()).toBe("child of parent")
})

test("override must override", () => {
    class Parent {
        constructor() {
            // makeObservable(this)
        }

        action() {
            return "parent"
        }
    }

    class Child extends Parent {
        constructor() {
            super()
            makeObservable(this, {
                action: override
            })
        }
        action() {
            return `child of ${super.action()}`
        }
    }

    expect(() => new Child()).toThrow(
        /^\[MobX\] 'ObservableObject@\d+\.action' is annotated with 'override', but no such annotated member was found on prototype\./
    )
})

test("cannot reannotate prop of dynamic object", () => {
    /*
    const o = makeObservable(
        {
            observable: "observable",
            action() {},
            get computed() {
                return this.observable
            },
            *flow() {
                return true
            }
        },
        {
            observable: true,
            computed: true,
            action: true,
            flow: true
        },
        { name: "name" }
    )
    console.log(isObservable(o))
    console.log(isObservableProp(o, "observable"))
    console.log(isComputedProp(o, "computed"))
    console.log(isFlow(o.flow))
    console.log(isAction(o.action))
    */
    /*
    // create dynamic object with observable prop
    const o = observable({ foo: 1 as any })
    // change it to function so it won't throw that action must be function
    o.foo = () => {}

    //console.log(getAdministration(o).values_)
    makeObservable(o, {
        foo: action
    })
    console.log(o.foo)
    console.log(isAction(o.foo))
    console.log(isObservableProp(o, "foo"))
    //console.log(getAdministration(o).values_)
    /*
    expect(() => {
        makeObservable(o, {
            foo: action
        })
    }).toThrow(/^\[MobX\] Cannot decorate/)
    */
})

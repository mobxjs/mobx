import { isFlow } from "../../../src/api/flow"
import { deepEnhancer } from "../../../src/internal"
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
    override,
    ObservableSet,
    ObservableMap
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

test("makeObservable supports autoBind", async () => {
    class Test {
        action() {
            return this
        }

        actionBound() {
            return this
        }

        *flow() {
            return this
        }

        *flowBound() {
            return this
        }

        constructor() {
            makeObservable(
                this,
                {
                    action: action,
                    actionBound: true,
                    flow: flow,
                    flowBound: true
                },
                {
                    autoBind: true
                }
            )
        }
    }

    const t = new Test()
    expect(isObservableObject(t)).toBe(true)
    expect(isAction(t.action)).toBe(true)
    expect(isAction(t.actionBound)).toBe(true)
    expect(t.action.call(undefined)).toBe(undefined)
    expect(t.actionBound.call(undefined)).toBe(t)
    expect(isFlow(t.flow)).toBe(true)
    expect(isFlow(t.flowBound)).toBe(true)
    expect(await t.flow.call(undefined)).toBe(undefined)
    expect(await t.flowBound.call(undefined)).toBe(t)
})

test("Extending builtins is not support #2765", () => {
    class ObservableMapLimitedSize extends ObservableMap {
        limitSize = 0
        constructor(map: Map<any, any>, enhancer = deepEnhancer, name: string) {
            super(map, enhancer, name)
            makeObservable(this, {
                limitSize: observable
            })
        }
    }

    class ObservableSetLimitedSize extends ObservableSet {
        limitSize = 0
        constructor(set: Set<any>, enhancer = deepEnhancer, name: string) {
            super(set, enhancer, name)
            makeObservable(this, {
                limitSize: observable
            })
        }
    }

    expect(() => {
        new ObservableMapLimitedSize(new Map([["key", "val"]]), deepEnhancer, "TestObject")
    }).toThrowErrorMatchingInlineSnapshot(`
        "[MobX] Cannot convert 'TestObject' into observable object:
        The target is already observable of different type.
        Extending builtins is not supported."
    `)
    expect(() => {
        new ObservableSetLimitedSize(new Set(), deepEnhancer, "TestObject")
    }).toThrowErrorMatchingInlineSnapshot(`
        "[MobX] Cannot convert 'TestObject' into observable object:
        The target is already observable of different type.
        Extending builtins is not supported."
    `)
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

test("makeAutoObservable supports autoBind", async () => {
    class Test {
        action() {
            return this
        }

        *flow() {
            return this
        }

        constructor() {
            makeAutoObservable(this, {}, { autoBind: true })
        }
    }

    const t = new Test()
    expect(isObservableObject(t)).toBe(true)
    expect(isAction(t.action)).toBe(true)
    expect(isFlow(t.flow)).toBe(true)
    expect(t.action.call(undefined)).toBe(t)
    expect(await t.flow.call(undefined)).toBe(t)
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

test("class - annotations", async () => {
    class Foo {
        ["observable"] = { nested: {} };
        ["observable.ref"] = { nested: {} };
        ["observable.shallow"] = { nested: {} }

        constructor() {
            makeObservable(this, {
                observable: observable,
                "observable.ref": observable.ref,
                "observable.shallow": observable.shallow,
                computed: computed,
                action: action,
                "action.bound": action.bound,
                flow: flow,
                "flow.bound": flow.bound
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

        *["flow.bound"]() {
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

    expect(isFlow(foo["flow.bound"])).toBe(true)
    expect(Object.getPrototypeOf(foo).hasOwnProperty("flow.bound")).toBe(true)
    expect(foo.hasOwnProperty("flow.bound")).toBe(true)
    expect(await foo["flow.bound"].call(null)).toBe(foo)
})

test("class - decorators", async () => {
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

        @flow.bound
        *["flow.bound"]() {
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

    expect(isFlow(foo["flow.bound"])).toBe(true)
    expect(Object.getPrototypeOf(foo).hasOwnProperty("flow.bound")).toBe(true)
    expect(foo.hasOwnProperty("flow.bound")).toBe(true)
    expect(await foo["flow.bound"].call(null)).toBe(foo)
})

test("subclass - annotation", () => {
    class Parent {
        ["observable"] = { nested: {} };
        ["observable.ref"] = { nested: {} };
        ["observable.shallow"] = { nested: {} }

        constructor() {
            makeObservable(this, {
                observable: observable,
                "observable.ref": observable.ref,
                "observable.shallow": observable.shallow,
                computed: computed,
                action: action,
                "action.bound": action.bound,
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
                observable2: observable,
                "observable.ref2": observable.ref,
                "observable.shallow2": observable.shallow,
                computed2: computed,
                action2: action,
                "action.bound2": action.bound,
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
                flow: flow,
                ["flow.bound"]: flow.bound
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
        *["flow.bound"]() {
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
        *flow(): any {
            const parent = yield super.flow()
            return "child of " + parent
        }
        *["flow.bound"](): any {
            const parent = yield super["flow.bound"]()
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
    expect(isAction(Parent.prototype["action.bound"])).toBe(false)
    expect(isAction(Child.prototype["action.bound"])).toBe(false)
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
    expect(await child.flow()).toBe("child of parent")

    // Flow bound
    expect(isFlow(Parent.prototype["flow.bound"])).toBe(true)
    expect(isFlow(Child.prototype["flow.bound"])).toBe(true)
    expect(isFlow(child["flow.bound"])).toBe(true)

    expect(child.hasOwnProperty("flow.bound")).toBe(true)

    expect(await Parent.prototype["flow.bound"]()).toBe("parent")
    expect(await Child.prototype["flow.bound"]()).toBe("child of parent")
    expect(await child["flow.bound"]()).toBe("child of parent")
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
        @flow.bound
        *["flow.bound"]() {
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
        *flow(): any {
            const parent = yield super.flow()
            return "child of " + parent
        }
        *["flow.bound"](): any {
            const parent = yield super["flow.bound"]()
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
    expect(isAction(Parent.prototype["action.bound"])).toBe(false)
    expect(isAction(Child.prototype["action.bound"])).toBe(false)
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
    expect(await child.flow()).toBe("child of parent")

    // Flow bound
    expect(isFlow(Parent.prototype["flow.bound"])).toBe(true)
    expect(isFlow(Child.prototype["flow.bound"])).toBe(true)
    expect(isFlow(child["flow.bound"])).toBe(true)

    expect(child.hasOwnProperty("flow.bound")).toBe(true)

    expect(await Parent.prototype["flow.bound"]()).toBe("parent")
    expect(await Child.prototype["flow.bound"]()).toBe("child of parent")
    expect(await child["flow.bound"]()).toBe("child of parent")
})

test("subclass - cannot re-annotate", () => {
    class Parent {
        observable = 1
        constructor() {
            makeObservable(this, {
                action: action,
                observable: observable,
                actionBound: action.bound,
                flow: flow,
                flowBound: flow.bound,
                computed: computed
            })
        }
        action() {}
        actionBound() {}
        *flow() {}
        *flowBound() {}
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

    class ChildFlow extends Parent {
        constructor() {
            super()
            makeObservable(this, {
                flow: flow
            })
        }
        *flow() {}
    }

    class ChildFlowBound extends Parent {
        constructor() {
            super()
            makeObservable(this, {
                flowBound: flow.bound
            })
        }
        *flowBound() {}
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
    expect(() => new ChildFlow()).toThrow(/^\[MobX\] Cannot apply/)
    expect(() => new ChildFlowBound()).toThrow(/^\[MobX\] Cannot apply/)
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
        @flow
        *flow() {}
        @flow.bound
        *flowBound() {}
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
        class ChildFlow extends Parent {
            constructor() {
                super()
                makeObservable(this)
            }
            @flow
            *flow() {}
        }
    }).toThrow(/^\[MobX\] Cannot apply/)

    expect(() => {
        class ChildFlowBound extends Parent {
            constructor() {
                super()
                makeObservable(this)
            }
            @flow.bound
            *flowBound() {}
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
        /^\[MobX\] 'Child@\d+\.action' is annotated with 'override', but no such annotated member was found on prototype\./
    )
})

test("@override must override", () => {
    class Parent {
        action() {
            return "parent"
        }
    }

    expect(() => {
        class Child extends Parent {
            constructor() {
                super()
                makeObservable(this)
            }
            @override
            action() {
                return `child of ${super.action()}`
            }
        }
    }).toThrow(
        /^\[MobX\] 'Child\.prototype\.action' is decorated with 'override', but no such decorated member was found on prototype\./
    )
})

test("makeAutoObservable + production build #2751", () => {
    const mobx = require(`../../../dist/mobx.cjs.production.min.js`)
    class Foo {
        x = "x"
        constructor() {
            mobx.makeAutoObservable(this)
        }
    }
    const foo = new Foo()
    expect(mobx.isObservableObject(foo)).toBe(true)
    expect(mobx.isObservableProp(foo, "x")).toBe(true)
})

// Makes sure that we don't define properties on proto as non-writable,
// as that would prevent initializing prop on instance via assigment.
test("inherited fields are assignable before makeObservable", () => {
    class Foo {
        constructor() {
            this.action = () => {}
            this.flow = function* flow() {}
            makeObservable(this, {
                action,
                flow
            })
        }

        action() {}
        *flow() {}
    }

    const foo1 = new Foo()
    expect(isAction(foo1.action)).toBe(true)
    expect(isFlow(foo1.flow)).toBe(true)

    const foo2 = new Foo()
    expect(isAction(foo2.action)).toBe(true)
    expect(isFlow(foo2.flow)).toBe(true)
})

test("makeAutoObservable + symbolic keys", () => {
    const observableSymbol = Symbol()
    const computedSymbol = Symbol()
    const actionSymbol = Symbol()

    class Foo {
        observable = "observable";
        [observableSymbol] = "observableSymbol"
        get [computedSymbol]() {
            return this.observable
        }
        [actionSymbol]() {}

        constructor() {
            makeAutoObservable(this)
        }
    }

    ;[new Foo(), new Foo()].forEach(foo => {
        expect(isObservableProp(foo, "observable")).toBe(true)
        expect(isObservableProp(foo, observableSymbol)).toBe(true)
        expect(isComputedProp(foo, computedSymbol)).toBe(true)
        expect(isAction(foo[actionSymbol])).toBe(true)
    })
})

test("makeAutoObservable + override + annotation cache #2832", () => {
    class Clazz {
        auto = []
        override = []
        constructor() {
            makeAutoObservable(this, {
                override: observable.ref
            })
        }
    }

    ;[new Clazz(), new Clazz()].forEach(x => {
        expect(isObservableProp(x, "auto")).toBe(true)
        expect(isObservable(x.auto)).toBe(true)
        expect(isObservableProp(x, "override")).toBe(true)
        expect(isObservable(x.override)).toBe(false)
    })
})

test("flow.bound #2941", async () => {
    class Clazz {
        constructor() {
            makeObservable(this, {
                flowBound: flow.bound
            })
        }
        *flowBound() {
            return this
        }
    }
    new Clazz()
    new Clazz()
    expect(isFlow(Clazz.prototype.flowBound)).toBe(true)
    expect(await Clazz.prototype.flowBound.call("ctx")).toBe("ctx")
})

test("makeObservable throws when mixing @decorators with annotations", () => {
    class Test {
        @observable x = 3

        constructor() {
            makeObservable(this, {})
        }
    }

    expect(() => new Test()).toThrow(
        /makeObservable second arg must be nullish when using decorators/
    )
})

test("makeAutoObservable + Object.create #3197", () => {
    const proto = {
        action() {},
        *flow() {},
        get computed() {
            return null
        }
    }
    const o = Object.create(proto)
    o.observable = 5
    makeAutoObservable(o)
    expect(isAction(proto.action)).toBe(true)
    expect(isFlow(proto.flow)).toBe(true)
    expect(isComputedProp(o, "computed")).toBe(true)
    expect(isObservableProp(o, "observable")).toBe(true)
})

test("flow.bound #3271", async () => {
    class Test {
        constructor() {
            makeObservable(this, { flowBound: flow.bound })
        }
        *flowBound() {
            return this
        }
    }

    const t1 = new Test()
    const t2 = new Test()

    // Make sure flow is actually bindable
    expect(
        await flow(function* () {
            return this
        }).bind(t1)()
    ).toBe(t1)

    expect(t1.hasOwnProperty("flowBound")).toBe(true)
    expect(t2.hasOwnProperty("flowBound")).toBe(true)

    expect(t1.flowBound !== t2.flowBound).toBe(true)

    expect(await t1.flowBound.call(null)).toBe(t1)
    expect(await t2.flowBound.call(null)).toBe(t2)
})

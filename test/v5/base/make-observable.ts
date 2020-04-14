import {
    makeObservable,
    action,
    computed,
    observable,
    isObservableObject,
    isObservableProp,
    isComputedProp,
    isAction,
    makeAutoObservable
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
                unbound: action,
                bound: true
                // @ts-expect-error
                // TODO: enable with TS 3.9 z: true
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
    expect(t.unbound.call(undefined)).toBe(t) // will be bound!
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
                unbound: action,
                y: false
                // @ts-expect-error
                // TODO: enable with TS 3.9 z: true
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
        `"[mobx] 'makeAutoObservable' can only be used for classes that don't have a superclass"`
    )
})

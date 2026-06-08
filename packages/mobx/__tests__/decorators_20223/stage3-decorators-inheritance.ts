import {
    action,
    autorun,
    computed,
    flow,
    flowResult,
    isAction,
    isComputedProp,
    isFlow,
    isObservableProp,
    observable,
    observe,
    runInAction
} from "../../src/mobx"

test("inherited observable accessor remains reactive in subclass", () => {
    class Parent {
        @observable accessor count = 1
    }

    class Child extends Parent {}

    const child = new Child()
    const seen: number[] = []
    const dispose = autorun(() => seen.push(child.count))

    runInAction(() => {
        child.count = 2
    })
    dispose()

    expect(isObservableProp(child, "count")).toBe(true)
    expect(seen).toEqual([1, 2])
})

// #4660: Supported all-decorator same-key computed override can delegate via super
test("computed override can delegate to parent computed with super", () => {
    class Parent {
        @observable accessor count = 1

        @computed
        get number() {
            return this.count
        }
    }

    class Child extends Parent {
        @computed
        override get number() {
            return super.number + 1
        }
    }

    const child = new Child()

    // Before first read, lazy computed bookkeeping must stay scoped to each requested key
    expect(isObservableProp(child, "number")).toBe(true)
    expect(isComputedProp(child, "number")).toBe(true)
    expect(isObservableProp(child, "count")).toBe(true)
    expect(isComputedProp(child, "count")).toBe(false)
    expect(isObservableProp(child, "missing")).toBe(false)
    expect(isComputedProp(child, "missing")).toBe(false)

    // Observing by public property key must observe the child computed, not the parent computed
    const seen: number[] = []
    const dispose = observe(child, "number", change => seen.push(change.newValue), true)

    // Direct reads still delegate through super and remain reactive after materialization
    expect(child.number).toBe(2)
    runInAction(() => {
        child.count = 2
    })
    dispose()

    expect(isObservableProp(child, "number")).toBe(true)
    expect(isComputedProp(child, "number")).toBe(true)
    expect(isObservableProp(child, "count")).toBe(true)
    expect(isComputedProp(child, "count")).toBe(false)
    expect(isObservableProp(child, "missing")).toBe(false)
    expect(isComputedProp(child, "missing")).toBe(false)
    expect(seen).toEqual([2, 3])
})

// #4660: If a subclass has a same-named @computed override that is still lazy,
// and another subclass member calls super.foo before foo itself has been read,
// this call materializes the child lazy entry and returns the overridden value
// instead of the parent value. For example, with override get number() {
// return super.number + 1 } and get parentNumber() { return super.number },
// the first child.parentNumber reads as 2 instead of the parent 1, making super
// behavior order-dependent
test.skip("computed sibling can read parent computed with super before child computed is read", () => {
    class Parent {
        @observable accessor count = 1

        @computed
        get number() {
            return this.count
        }
    }

    class Child extends Parent {
        @computed
        override get number() {
            return super.number + 1
        }

        @computed
        get parentNumber() {
            return super.number
        }
    }

    const child = new Child()

    expect(child.parentNumber).toBe(1)
    expect(child.number).toBe(2)
})

// #4660: Super delegation can chain through multiple decorated prototypes
test("computed override can delegate through multiple parent computeds", () => {
    class GrandParent {
        @observable accessor count = 1

        @computed
        get number() {
            return this.count
        }
    }

    class Parent extends GrandParent {
        @computed
        override get number() {
            return super.number + 1
        }
    }

    class Child extends Parent {
        @computed
        override get number() {
            return super.number + 1
        }
    }

    const child = new Child()
    const seen: number[] = []
    const dispose = observe(child, "number", change => seen.push(change.newValue), true)

    runInAction(() => {
        child.count = 2
    })
    dispose()

    expect(child.number).toBe(4)
    expect(seen).toEqual([3, 4])
})

// #4660: A parent constructor read must not pin the parent computed as the child property
test("computed override wins when parent constructor reads the same key first", () => {
    class Parent {
        constructor() {
            this.number
        }

        @observable accessor count = 1

        @computed
        get number() {
            return this.count
        }
    }

    class Child extends Parent {
        @computed
        override get number() {
            return 0
        }
    }

    const child = new Child()
    const seen: number[] = []
    const dispose = observe(child, "number", change => seen.push(change.newValue), true)
    dispose()

    expect(child.number).toBe(0)
    expect(isComputedProp(child, "number")).toBe(true)
    expect(seen).toEqual([0])
})

test("manually wrapped action field can be overridden as an ordinary field", () => {
    class Parent {
        @observable accessor count = 0

        increment = action(() => {
            this.count += 1
        })
    }

    class Child extends Parent {
        increment = action(() => {
            this.count += 2
        })
    }

    const child = new Child()
    const seen: number[] = []
    const dispose = autorun(() => seen.push(child.count))

    child.increment()
    dispose()

    expect(isAction(child.increment)).toBe(true)
    expect(seen).toEqual([0, 2])
})

test("subclass can add new observable, computed, and action members", () => {
    class Parent {
        @observable accessor count = 1
    }

    class Child extends Parent {
        @observable accessor extra = 2

        @computed
        get total() {
            return this.count + this.extra
        }

        @action
        incrementExtra() {
            this.extra += 1
        }

        @action.bound
        incrementCount() {
            this.count += 1
        }
    }

    const child = new Child()
    const seen: number[] = []
    const dispose = autorun(() => seen.push(child.total))
    const incrementCount = child.incrementCount

    child.incrementExtra()
    incrementCount()
    dispose()

    expect(isComputedProp(child, "total")).toBe(true)
    expect(isAction(child.incrementExtra)).toBe(true)
    expect(isAction(child.incrementCount)).toBe(true)
    expect(seen).toEqual([3, 4, 5])
})

test("action override can call parent action with super", () => {
    class Parent {
        @observable accessor count = 0

        @action
        increment(value: number) {
            this.count += value
        }
    }

    class Child extends Parent {
        @action
        override increment(value: number) {
            super.increment(value)
            this.count += 1
        }
    }

    const child = new Child()
    const seen: number[] = []
    const dispose = autorun(() => seen.push(child.count))

    child.increment(2)
    dispose()

    expect(isAction(child.increment)).toBe(true)
    expect(child.count).toBe(3)
    expect(seen).toEqual([0, 3])
})

test("action.bound override can be called after extraction", () => {
    class Parent {
        @observable accessor count = 0

        @action.bound
        increment(value: number) {
            this.count += value
        }
    }

    class Child extends Parent {
        @action.bound
        override increment(value: number) {
            super.increment(value)
            this.count += 1
        }
    }

    const child = new Child()
    const seen: number[] = []
    const dispose = autorun(() => seen.push(child.count))
    const increment = child.increment

    increment(2)
    dispose()

    expect(isAction(child.increment)).toBe(true)
    expect(child.count).toBe(3)
    expect(seen).toEqual([0, 3])
})

test("flow override can wait for parent flow before child updates", async () => {
    class ProfileStore {
        @observable accessor status: "idle" | "loading" | "ready" = "idle"
        @observable accessor name = "";

        @flow
        *loadProfile(userId: number) {
            this.status = "loading"
            yield Promise.resolve()
            this.name = `User ${userId}`
            this.status = "ready"
        }
    }

    class ProfilePageStore extends ProfileStore {
        @observable accessor title = "";

        @flow
        override *loadProfile(userId: number) {
            yield flowResult(super.loadProfile(userId))
            this.title = `${this.name} profile`
        }
    }

    const profile = new ProfilePageStore()
    const seen: string[] = []
    const dispose = autorun(() => seen.push(`${profile.status}|${profile.name}|${profile.title}`))

    await flowResult(profile.loadProfile(2))
    dispose()

    expect(isFlow(profile.loadProfile)).toBe(true)
    expect(profile.status).toBe("ready")
    expect(profile.name).toBe("User 2")
    expect(profile.title).toBe("User 2 profile")
    expect(seen).toContain("idle||")
    expect(seen).toContain("loading||")
    expect(seen[seen.length - 1]).toBe("ready|User 2|User 2 profile")
})

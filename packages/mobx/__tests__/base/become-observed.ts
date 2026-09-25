import {
    autorun,
    onBecomeObserved,
    observable,
    observableRef,
    computed,
    action,
    makeObservable,
    onBecomeUnobserved,
    runInAction,
    makeAutoObservable,
    getObserverTree
} from "../../src/mobx"

describe("become-observed", () => {
    it("work on map with number as key", () => {
        const oMap = observable.map()
        const key = 1
        oMap.set(key, observable.box("value"))
        const cb = jest.fn()
        onBecomeObserved(oMap, key, cb)
        autorun(() => oMap.get(key))
        expect(cb).toHaveBeenCalled()
    })
})

test("#2309 don't trigger oBO for computeds that aren't subscribed to", () => {
    const events: string[] = []

    class Asd {
        @observable accessor prop = 42

        @computed
        get computed() {
            return this.prop
        }

        @action
        actionProp() {
            const foo = this.prop
        }

        @action
        actionComputed() {
            const bar = this.computed
        }
    }

    const asd = new Asd()
    onBecomeObserved(asd, "prop", () => {
        events.push("onBecomeObserved")
    })

    onBecomeUnobserved(asd, "prop", () => {
        events.push("onBecomeUnobserved")
    })

    asd.actionProp()
    events.push("--")
    asd.actionComputed()
    expect(events).toEqual(["--"])
})

describe("#2309 onBecomeObserved inconsistencies", () => {
    let events: string[] = []

    beforeEach(() => {
        events = []
    })

    test("caseA", () => {
        // Computed {keepAlive: false} -> Observable
        const o = observable.box(1)
        const ca = computed(
            () => {
                return o.get()
            },
            { keepAlive: false }
        )

        onBecomeObserved(o, () => events.push(`o observed`))
        onBecomeUnobserved(o, () => events.push(`o unobserved`))
        onBecomeObserved(ca, () => events.push(`ca observed`))
        onBecomeUnobserved(ca, () => events.push(`ca unobserved`))
        expect(events).toEqual([])
        ca.get()
        expect(events).toEqual([])
    })

    test("caseB", () => {
        // Computed {keepAlive: false} -> Computed {keepAlive: false} -> Observable
        const o = observable.box(1)
        const ca = computed(
            () => {
                return o.get()
            },
            { keepAlive: false }
        )

        const cb = computed(
            () => {
                return ca.get() * 2
            },
            { keepAlive: false }
        )

        onBecomeObserved(o, () => events.push(`o observed`))
        onBecomeUnobserved(o, () => events.push(`o unobserved`))
        onBecomeObserved(ca, () => events.push(`ca observed`))
        onBecomeUnobserved(ca, () => events.push(`ca unobserved`))
        onBecomeObserved(cb, () => events.push(`cb observed`))
        onBecomeUnobserved(cb, () => events.push(`cb unobserved`))
        expect(events).toEqual([])
        cb.get()
        expect(events).toEqual([])
    })

    test("caseC", () => {
        // Computed {keepAlive: true} -> Observable
        const o = observable.box(1)
        const ca = computed(
            () => {
                return o.get()
            },
            { keepAlive: true }
        )

        onBecomeObserved(o, () => events.push(`o observed`))
        onBecomeUnobserved(o, () => events.push(`o unobserved`))
        onBecomeObserved(ca, () => events.push(`ca observed`))
        onBecomeUnobserved(ca, () => events.push(`ca unobserved`))
        expect(events).toEqual([])
        ca.get()
        expect(events).toEqual(["o observed"]) // everything is hot, and 'o' is really observed so that the keptAlive computed knows about its state
    })

    test("caseD", () => {
        // Computed {keepAlive: true} -> Computed {keepAlive: false} -> Observable
        // logs: `o observed`
        // potential issue: why are the callbacks not called on `ca` ?
        const o = observable.box(1)
        const ca = computed(
            () => {
                return o.get()
            },
            { keepAlive: false }
        )

        const cb = computed(
            () => {
                return ca.get() * 2
            },
            { keepAlive: true }
        )

        onBecomeObserved(o, () => events.push(`o observed`))
        onBecomeUnobserved(o, () => events.push(`o unobserved`))
        onBecomeObserved(ca, () => events.push(`ca observed`))
        onBecomeUnobserved(ca, () => events.push(`ca unobserved`))
        onBecomeObserved(cb, () => events.push(`cb observed`))
        onBecomeUnobserved(cb, () => events.push(`cb unobserved`))
        expect(events).toEqual([])
        cb.get()
        expect(events).toEqual(["ca observed", "o observed"]) // see above
    })

    test("caseE - base", () => {
        const o = observable.box(1)
        const ca = computed(
            () => {
                return o.get()
            },
            { keepAlive: false }
        )

        const cb = computed(
            () => {
                return ca.get() * 2
            },
            { keepAlive: false }
        )

        onBecomeObserved(o, () => events.push(`o observed`))
        onBecomeUnobserved(o, () => events.push(`o unobserved`))
        onBecomeObserved(ca, () => events.push(`ca observed`))
        onBecomeUnobserved(ca, () => events.push(`ca unobserved`))
        onBecomeObserved(cb, () => events.push(`cb observed`))
        onBecomeUnobserved(cb, () => events.push(`cb unobserved`))

        const u = autorun(() => cb.get())
        u()
        expect(events).toEqual([
            "cb observed",
            "ca observed",
            "o observed",
            "cb unobserved",
            "ca unobserved",
            "o unobserved"
        ])
    })

    test("caseE", () => {
        const o = observable.box(1)
        const ca = computed(
            () => {
                return o.get()
            },
            { keepAlive: false }
        )

        const cb = computed(
            () => {
                return ca.get() * 2
            },
            { keepAlive: true }
        )

        onBecomeObserved(o, () => events.push(`o observed`))
        onBecomeUnobserved(o, () => events.push(`o unobserved`))
        onBecomeObserved(ca, () => events.push(`ca observed`))
        onBecomeUnobserved(ca, () => events.push(`ca unobserved`))
        onBecomeObserved(cb, () => events.push(`cb observed`))
        onBecomeUnobserved(cb, () => events.push(`cb unobserved`))

        const u = autorun(() => cb.get())
        u()
        // Note that at this point the observables never become unobserved anymore!
        // That is correct, because if doing our kept-alive computed doesn't recompute until reobserved,
        // itself it is still observing all the values of its own deps to figure whether it is still
        // up to date or not
        expect(events).toEqual(["cb observed", "ca observed", "o observed", "cb unobserved"])

        events.splice(0)
        const u2 = autorun(() => cb.get())
        u2()
        expect(events).toEqual(["cb observed", "cb unobserved"])
    })

    test("caseF", () => {
        // Computed {keepAlive: true} -> Computed {keepAlive: false} -> Observable
        // cb.get() first then autorun() then unsub()
        const o = observable.box(1)
        const ca = computed(
            () => {
                return o.get()
            },
            { keepAlive: false }
        )

        const cb = computed(
            () => {
                return ca.get() * 2
            },
            { keepAlive: true }
        )

        onBecomeObserved(o, () => events.push(`o observed`))
        onBecomeUnobserved(o, () => events.push(`o unobserved`))
        onBecomeObserved(ca, () => events.push(`ca observed`))
        onBecomeUnobserved(ca, () => events.push(`ca unobserved`))
        onBecomeObserved(cb, () => events.push(`cb observed`))
        onBecomeUnobserved(cb, () => events.push(`cb unobserved`))
        cb.get()

        expect(events).toEqual(["ca observed", "o observed"])
        events.splice(0)
        const u = autorun(() => cb.get())
        u()
        expect(events).toEqual(["cb observed", "cb unobserved"])
    })
})

describe("nested computes don't trigger hooks #2686", () => {
    let events: string[] = []

    class Lower {
        public lowerValue$ = -1

        public isObserved = false

        constructor() {
            makeObservable(this, {
                lowerValue$: observable
            })

            onBecomeObserved(
                this,
                "lowerValue$",
                action(() => {
                    events.push("onBecomeObserved")
                    this.isObserved = true
                })
            )
            onBecomeUnobserved(
                this,
                "lowerValue$",
                action(() => {
                    events.push("onBecomeUnobserved")
                    this.isObserved = false
                })
            )
        }
    }

    class UpperComputed {
        constructor() {
            makeObservable(this, {
                upperValue$: computed,
                lower$: observableRef
            })
        }

        public lower$: Lower | undefined

        public get upperValue$() {
            events.push("upperValue$")
            const lower = this.lower$
            return lower ? lower.lowerValue$ : -Infinity
        }
    }

    const upperComputed = new UpperComputed()
    const lowerForComputed = new Lower()

    // Set up observers
    const d = autorun(() => {
        events.push("value read through computed: " + upperComputed.upperValue$)
    })

    // Provide the 'lower' values
    runInAction(() => {
        upperComputed.lower$ = lowerForComputed
    })

    // Check if the lower values are being observed.
    expect(lowerForComputed.isObserved).toBe(true)

    d()
    expect(lowerForComputed.isObserved).toBe(false)

    expect(events).toEqual([
        "upperValue$",
        "value read through computed: -Infinity",
        "upperValue$",
        "onBecomeObserved",
        "value read through computed: -1",
        "onBecomeUnobserved"
    ])
})

test("#2686 - 2", () => {
    const events: string[] = []
    const options = { useColors: false }
    makeAutoObservable(options)
    const selection = { color: "red" }
    makeAutoObservable(selection)

    const blue = computed(() => {
        let val
        if (options.useColors) {
            const isSelected = computed(() => selection.color === "blue")
            onBecomeObserved(isSelected, () => events.push("observing"))
            onBecomeUnobserved(isSelected, () => events.push("unobserving"))
            val = isSelected.get()
        }
        return { isSelected: val }
    })

    const d = autorun(() => events.push(blue.get().isSelected ? "selected" : "unselected"))

    runInAction(() => {
        options.useColors = true
        selection.color = "blue"
    })
    d()
    expect(events).toEqual(["unselected", "observing", "selected", "unobserving"])
})

test("#2686 - 3", () => {
    const events: string[] = []

    // half first element of array
    function halfFirst(data) {
        const first = computed(() => {
            events.push("recalculating")
            return Math.round(data.elements[0] / 2) + data.suffix
        })

        onBecomeObserved(first, () => {
            events.push("observing first")
        })

        return first
    }

    // APP

    const network = observable({ model: null as any })

    // load
    const load = computed(() => {
        // wait to load it
        if (network.model) {
            return halfFirst(network.model)
        }
        return undefined
    })

    // display
    const result = computed(() => (load.get() ? load.get()!.get() : "loading"))
    autorun(() => {
        events.push("Current result: " + result.get())
    })

    runInAction(() => (network.model = observable({ suffix: "$", elements: [2, 4, 5] })))
    runInAction(() => (network.model.elements[0] = 3))
    runInAction(() => (network.model.elements[0] = 4))
    runInAction(() => (network.model.elements[0] = 5))
    expect(events).toEqual([
        "Current result: loading",
        "observing first",
        "recalculating",
        "Current result: 1$",
        "recalculating",
        "Current result: 2$",
        "recalculating",
        "recalculating",
        "Current result: 3$"
    ])
})

test("#2667", () => {
    const events: any[] = []
    class LazyInitializedList {
        @observable accessor items: string[] | undefined = undefined

        @observable accessor listName: string

        constructor(listName: string, lazyItems: string[]) {
            this.listName = listName
            onBecomeObserved(
                this,
                "items",
                action(() => {
                    this.items = lazyItems
                    events.push("onBecomeObserved" + listName)
                })
            )
            onBecomeUnobserved(
                this,
                "items",
                action(() => {
                    this.items = undefined
                    events.push("onBecomeUnobserved" + listName)
                })
            )
        }
    }

    class ItemsStore {
        @observable accessor list: LazyInitializedList

        constructor() {
            this.list = new LazyInitializedList("initial", ["a, b, c"])
        }

        @action
        changeList = () => {
            this.list = new LazyInitializedList("new", ["b, c, a"])
        }

        @computed
        get items(): string[] | undefined {
            return this.list.items
        }

        @computed
        get activeListName(): string {
            return this.list.listName
        }
    }

    const store = new ItemsStore()

    const d = autorun(() => {
        events.push(store.items?.length ?? "-")
        events.push(store.activeListName)
    })

    store.changeList()

    d()

    expect(events).toEqual([
        "onBecomeObservedinitial",
        1,
        "initial",
        "onBecomeObservednew",
        1,
        "new",
        "onBecomeUnobservedinitial",
        "onBecomeUnobservednew"
    ])
})

test("#3954 - disposing a chain of reactions from onBecomeUnobserved doesn't overflow the stack", () => {
    // Each box's onBecomeUnobserved handler disposes the next reaction in the
    // chain. Disposing reaction[0] unobserves box[0], whose handler disposes
    // reaction[1], which unobserves box[1], and so on. Each of those disposals
    // re-enters endBatch() while the previous one is still draining
    // pendingUnobservations, so this used to recurse N deep instead of
    // looping, overflowing the stack for a large enough chain.
    const N = 10000
    const boxes = Array.from({ length: N }, () => observable.box(0))
    const disposers = boxes.map(box => autorun(() => box.get()))
    let unobservedCount = 0

    boxes.forEach((box, i) => {
        onBecomeUnobserved(box, () => {
            unobservedCount++
            if (i + 1 < N) {
                disposers[i + 1]()
            }
        })
    })

    expect(() => disposers[0]()).not.toThrow()

    // the whole chain should have unwound, not just the first link
    expect(unobservedCount).toBe(N)
})

test("#3954 followup - isRunningUnobservations is released even if an onBecomeUnobserved handler throws", () => {
    const boxA = observable.box(0)
    const disposeA = autorun(() => boxA.get())
    onBecomeUnobserved(boxA, () => {
        throw new Error("boom")
    })

    // the handler's exception should still surface to the caller, not be swallowed
    expect(() => disposeA()).toThrow("boom")

    // if the internal guard were left stuck true after that exception, every
    // future endBatch() would silently stop draining pendingUnobservations,
    // so this completely unrelated disposal would never fire its own handler
    const boxB = observable.box(0)
    const disposeB = autorun(() => boxB.get())
    let unobservedB = false
    onBecomeUnobserved(boxB, () => {
        unobservedB = true
    })

    disposeB()

    expect(unobservedB).toBe(true)
})

test("works with ObservableSet #3595", () => {
    const onSetObserved = jest.fn()
    const onSetUnobserved = jest.fn()

    const set = observable.set()

    const disposeOBO = onBecomeObserved(set, onSetObserved)
    const disposeOBU = onBecomeUnobserved(set, onSetUnobserved)
    const diposeAutorun = autorun(() => set.size)
    diposeAutorun()
    disposeOBO()
    disposeOBU()

    expect(onSetObserved).toHaveBeenCalledTimes(1)
    expect(onSetUnobserved).toHaveBeenCalledTimes(1)
})

test("onBecomeObserved fires when a computed becomes observed while serving a cached value #4547", () => {
    const events: string[] = []

    const o = observable.box(1)
    onBecomeObserved(o, () => events.push("BO"))
    onBecomeUnobserved(o, () => events.push("BUO"))
    const c = computed(() => o.get())

    let disposeAutorun: () => void
    runInAction(() => {
        // non-reactive read inside the batch leaves `c` up-to-date but unobserved
        void c.get()
        // `c` becomes observed during endBatch() without recomputing, so it never
        // re-reports `o` — the hook has to cascade instead
        disposeAutorun = autorun(() => void c.get())
    })

    expect(events).toEqual(["BO"])

    disposeAutorun!()
    expect(events).toEqual(["BO", "BUO"])
})

test("onBecomeObserved cascades through a chain of cached computeds #4547", () => {
    const events: string[] = []

    const o = observable.box(1)
    onBecomeObserved(o, () => events.push("BO"))
    onBecomeUnobserved(o, () => events.push("BUO"))
    // two levels, as in the reported issue: the cascade has to recurse
    const inner = computed(() => o.get())
    const outer = computed(() => inner.get())

    let disposeAutorun: () => void
    runInAction(() => {
        void outer.get()
        disposeAutorun = autorun(() => void outer.get())
    })

    expect(events).toEqual(["BO"])

    disposeAutorun!()
    expect(events).toEqual(["BO", "BUO"])
})

test("onBecomeObserved fires for a dependency gained by an observed computed in an action #3674", () => {
    const events: string[] = []
    const enabled = observable.box(false)
    const resource = observable.box(1)
    onBecomeObserved(resource, () => events.push("BO"))
    onBecomeUnobserved(resource, () => events.push("BUO"))
    const derived = computed(() => (enabled.get() ? resource.get() : null))
    const disposeAutorun = autorun(() => {
        derived.get()
    })

    runInAction(() => {
        enabled.set(true)
        derived.get()
    })

    expect(events).toEqual(["BO"])

    disposeAutorun()
    expect(events).toEqual(["BO", "BUO"])
})

test("temporary computed observers do not activate lifecycle hooks", () => {
    const events: string[] = []
    const enabled = observable.box(false)
    const resource = observable.box(1)
    onBecomeObserved(resource, () => events.push("BO"))
    onBecomeUnobserved(resource, () => events.push("BUO"))
    const inner = computed(() => (enabled.get() ? resource.get() : null))
    const outer = computed(() => inner.get())

    runInAction(() => {
        outer.get()
        enabled.set(true)
        inner.get()
    })

    expect(events).toEqual([])
})

test("observers can be removed and re-added repeatedly (lazy observers_ Set)", () => {
    const events: string[] = []
    const box = observable.box(1)
    const double = computed(() => box.get() * 2)
    onBecomeObserved(box, () => events.push("box observed"))
    onBecomeUnobserved(box, () => events.push("box unobserved"))
    onBecomeObserved(double, () => events.push("double observed"))
    onBecomeUnobserved(double, () => events.push("double unobserved"))

    for (let round = 0; round < 3; round++) {
        const seen: number[] = []
        const d1 = autorun(() => seen.push(double.get()))
        const d2 = autorun(() => seen.push(box.get()))
        runInAction(() => box.set(box.get() + 1))
        d1()
        // still observed by d2
        runInAction(() => box.set(box.get() + 1))
        d2()
        // no observers left, changes go nowhere
        runInAction(() => box.set(box.get() + 1))
        const b = 1 + round * 3
        expect(seen).toEqual([2 * b, b, 2 * (b + 1), b + 1, b + 2])
    }
    const cycle = ["double observed", "box observed", "double unobserved", "box unobserved"]
    expect(events).toEqual([...cycle, ...cycle, ...cycle])
})

test("conditional dependencies that come and go keep tracking correctly", () => {
    const events: string[] = []
    const cond = observable.box(true)
    const a = observable.box("a1")
    const b = observable.box("b1")
    onBecomeObserved(a, () => events.push("a observed"))
    onBecomeUnobserved(a, () => events.push("a unobserved"))
    const seen: string[] = []
    const d = autorun(() => seen.push(cond.get() ? a.get() : b.get()))

    runInAction(() => cond.set(false)) // drops a
    runInAction(() => a.set("a2")) // not observed anymore
    runInAction(() => cond.set(true)) // picks a up again
    runInAction(() => a.set("a3"))
    d()
    expect(seen).toEqual(["a1", "b1", "a2", "a3"])
    expect(events).toEqual(["a observed", "a unobserved", "a observed", "a unobserved"])
})

test("the observers_ Set is released once the last observer leaves", () => {
    const observersOf = (o: object) => (o as any).observers_ as Set<unknown> | null
    const box = observable.box(1)
    const double = computed(() => box.get() * 2)
    expect(observersOf(box)).toBe(null)

    const d1 = autorun(() => double.get())
    const d2 = autorun(() => box.get())
    expect(observersOf(box)!.size).toBe(2)
    expect(observersOf(double)!.size).toBe(1)

    d1()
    expect(observersOf(double)).toBe(null)
    expect(observersOf(box)!.size).toBe(1)

    d2()
    expect(observersOf(box)).toBe(null)
    expect(getObserverTree(box).observers).toBeUndefined()

    // an observer that leaves and another that joins within the same batch reuse the Set
    const d3 = autorun(() => box.get())
    const set = observersOf(box)
    let d4!: () => void
    runInAction(() => {
        d3()
        d4 = autorun(() => box.get())
    })
    expect(observersOf(box)).toBe(set)
    expect(set!.size).toBe(1)
    d4()
    expect(observersOf(box)).toBe(null)
})

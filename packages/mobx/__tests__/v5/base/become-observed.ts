import {
    autorun,
    onBecomeObserved,
    observable,
    computed,
    action,
    makeObservable,
    onBecomeUnobserved,
    runInAction,
    makeAutoObservable
} from "../../../src/mobx"

describe("become-observed", () => {
    it("work on map with number as key", () => {
        const oMap = observable.map()
        const key = 1
        oMap.set(key, observable.box("value"))
        const cb = jest.fn()
        onBecomeObserved(oMap, key, cb)
        autorun(() => oMap.get(key))
        expect(cb).toBeCalled()
    })
})

test("#2309 don't trigger oBO for computeds that aren't subscribed to", () => {
    const events: string[] = []

    class Asd {
        @observable prop = 42

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

        constructor() {
            makeObservable(this)
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
                lower$: observable.ref
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
        @observable
        public items: string[] | undefined

        @observable
        public listName

        public constructor(listName: string, lazyItems: string[]) {
            makeObservable(this)
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
        @observable
        private list: LazyInitializedList

        public constructor() {
            this.list = new LazyInitializedList("initial", ["a, b, c"])
            makeObservable(this)
        }

        @action
        public changeList = () => {
            this.list = new LazyInitializedList("new", ["b, c, a"])
        }

        @computed
        public get items(): string[] | undefined {
            return this.list.items
        }

        @computed
        public get activeListName(): string {
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

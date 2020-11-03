"use strict"

import { extendObservable, observable, autorun, computed, runInAction } from "../../../src/mobx"

test("nested computeds should not run unnecessary", () => {
    function Item(name) {
        extendObservable(this, {
            name: name,
            get index() {
                const i = store.items.indexOf(this)
                if (i === -1) throw "not found"
                return i
            }
        })
    }

    const store = observable({
        items: [],
        get asString() {
            return this.items.map(item => item.index + ":" + item.name).join(",")
        }
    })
    store.items.push(new Item("item1"))

    const values = []
    autorun(() => {
        values.push(store.asString)
    })

    store.items.replace([new Item("item2")])

    expect(values).toEqual(["0:item1", "0:item2"])
})

test("fix #1535: stale observables", cb => {
    // see https://codesandbox.io/s/k92o2jmz63
    const snapshots = []

    const x = observable.box(1)

    // Depends on observable x
    const derived1 = computed(() => {
        return x.get() + 1
    })

    // Depends on computed derived1
    const derived2 = computed(() => {
        return derived1.get() + 1
    })

    function increment() {
        runInAction(() => {
            x.set(x.get() + 1)
            // No problems here
            derived1.get()
            derived2.get()
        })
    }

    function brokenIncrement() {
        runInAction(() => x.set(x.get() + 1))
        // Acessing computed outside of action causes staleness
        // NOTE IT DOESN'T MATTER WHICH COMPUTED IS ACCESSED
        // derived1.get();
        derived2.get()
    }

    autorun(
        () => {
            snapshots.push(`${x.get()}, ${derived1.get()}, ${derived2.get()}`)
        },
        {
            scheduler(f) {
                setImmediate(f)
            }
        }
    )

    increment()
    setTimeout(() => {
        brokenIncrement()
    }, 100)
    setTimeout(() => {
        expect(snapshots).toEqual(["2, 3, 4", "3, 4, 5"])
        cb()
    }, 1000)
})

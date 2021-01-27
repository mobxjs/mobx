const test = require("tape")
const log = require("./index.js").logMeasurement

function gc() {
    if (typeof global.gc === "function") global.gc()
}

function voidObserver() {
    // nothing, nada, noppes.
}

module.exports = function runForVersion(version) {
    /*
results of this test:
300/40000 mseconds on netbook (AMD c60 processor, same test is on Intel i7 3770 ~10 times faster)
220/37000 after removing forEach
140/30000 after not using (un)shift / pop / push
186/113 after remove filter/length call to detect whether depencies are stable. 300 times faster. w00t.

*/
    const mobx = require(`../../dist/mobx.cjs.production.min.js`)
    if (version === "legacy") {
        mobx.configure({ useProxies: false })
    }
    const observable = mobx.observable
    const computed = mobx.computed

    test(`${version} - one observes ten thousand that observe one`, function (t) {
        gc()
        const a = observable.box(2)

        // many observers that listen to one..
        const observers = []
        for (let i = 0; i < 10000; i++) {
            ;(function (idx) {
                observers.push(
                    computed(function () {
                        return a.get() * idx
                    })
                )
            })(i)
        }

        // let bCalcs = 0
        // one observers that listens to many..
        const b = computed(function () {
            let res = 0
            for (let i = 0; i < observers.length; i++) res += observers[i].get()
            // bCalcs += 1
            return res
        })

        const start = now()

        mobx.observe(b, voidObserver, true) // start observers
        t.equal(99990000, b.get())
        const initial = now()

        a.set(3)
        t.equal(149985000, b.get()) // yes, I verified ;-).
        //t.equal(2, bCalcs);
        const end = now()

        log(
            "One observers many observes one - Started/Updated in " +
                (initial - start) +
                "/" +
                (end - initial) +
                " ms."
        )
        t.end()
    })

    test(`${version} - five hundrend properties that observe their sibling`, function (t) {
        gc()
        const observables = [observable.box(1)]
        for (let i = 0; i < 500; i++) {
            ;(function (idx) {
                observables.push(
                    computed(function () {
                        return observables[idx].get() + 1
                    })
                )
            })(i)
        }

        const start = now()

        const last = observables[observables.length - 1]
        mobx.observe(last, voidObserver)
        t.equal(501, last.get())
        const initial = now()

        observables[0].set(2)
        t.equal(502, last.get())
        const end = now()

        log(
            "500 props observing sibling -  Started/Updated in " +
                (initial - start) +
                "/" +
                (end - initial) +
                " ms."
        )
        t.end()
    })

    test(`${version} - late dependency change`, function (t) {
        gc()
        const values = []
        for (let i = 0; i < 100; i++) values.push(observable.box(0))

        const sum = computed(function () {
            let sum = 0
            for (let i = 0; i < 100; i++) sum += values[i].get()
            return sum
        })

        mobx.observe(sum, voidObserver, true)

        const start = new Date()

        for (let i = 0; i < 10000; i++) values[99].set(i)

        t.equal(sum.get(), 9999)
        log("Late dependency change - Updated in " + (new Date() - start) + "ms.")
        t.end()
    })

    test(`${version} - lots of unused computables`, function (t) {
        gc()
        const a = observable.box(1)

        // many observers that listen to one..
        const observers = []
        for (let i = 0; i < 10000; i++) {
            ;(function (idx) {
                observers.push(
                    computed(function () {
                        return a.get() * idx
                    })
                )
            })(i)
        }

        // one observers that listens to many..
        const b = computed(function () {
            let res = 0
            for (let i = 0; i < observers.length; i++) res += observers[i].get()
            return res
        })

        let sum = 0
        const subscription = mobx.observe(
            b,
            function (e) {
                sum = e.newValue
            },
            true
        )

        t.equal(sum, 49995000)

        // unsubscribe, nobody should listen to a() now!
        subscription()

        const start = now()

        a.set(3)
        t.equal(sum, 49995000) // unchanged!

        const end = now()

        log("Unused computables -   Updated in " + (end - start) + " ms.")
        t.end()
    })

    test(`${version} - many unreferenced observables`, function (t) {
        gc()
        const a = observable.box(3)
        const b = observable.box(6)
        const c = observable.box(7)
        const d = computed(function () {
            return a.get() * b.get() * c.get()
        })
        t.equal(d.get(), 126)
        const start = now()
        for (let i = 0; i < 10000; i++) {
            c.set(i)
            d.get()
        }
        const end = now()

        log("Unused observables -  Updated in " + (end - start) + " ms.")

        t.end()
    })

    test(`${version} - array reduce`, function (t) {
        gc()
        let aCalc = 0
        const ar = observable([])
        const b = observable.box(1)

        const sum = computed(function () {
            aCalc++
            return ar.reduce(function (a, c) {
                return a + c * b.get()
            }, 0)
        })
        mobx.observe(sum, voidObserver)

        const start = now()

        for (let i = 0; i < 1000; i++) ar.push(i)

        t.equal(499500, sum.get())
        t.equal(1001, aCalc)
        aCalc = 0

        const initial = now()

        for (let i = 0; i < 1000; i++) ar[i] = ar[i] * 2
        b.set(2)

        t.equal(1998000, sum.get())
        t.equal(1000, aCalc)

        const end = now()

        log(
            "Array reduce -  Started/Updated in " +
                (initial - start) +
                "/" +
                (end - initial) +
                " ms."
        )
        t.end()
    })

    test(`${version} - array classic loop`, function (t) {
        gc()
        const ar = observable([])
        let aCalc = 0
        const b = observable.box(1)
        const sum = computed(function () {
            let s = 0
            aCalc++
            for (let i = 0; i < ar.length; i++) s += ar[i] * b.get()
            return s
        })
        mobx.observe(sum, voidObserver, true) // calculate

        const start = now()

        t.equal(1, aCalc)
        for (let i = 0; i < 1000; i++) ar.push(i)

        t.equal(499500, sum.get())
        t.equal(1001, aCalc)

        const initial = now()
        aCalc = 0

        for (let i = 0; i < 1000; i++) ar[i] = ar[i] * 2
        b.set(2)

        t.equal(1998000, sum.get())
        t.equal(1000, aCalc)

        const end = now()

        log(
            "Array loop -  Started/Updated in " + (initial - start) + "/" + (end - initial) + " ms."
        )
        t.end()
    })

    function order_system_helper(t, usebatch, keepObserving) {
        gc()
        t.equal(mobx._isComputingDerivation(), false)
        const orders = observable([])
        const vat = observable.box(2)

        const totalAmount = computed(function () {
            let sum = 0,
                l = orders.length
            for (let i = 0; i < l; i++) sum += orders[i].total.get()
            return sum
        })

        function OrderLine(order, price, amount) {
            this.price = observable.box(price)
            this.amount = observable.box(amount)
            this.total = computed(
                function () {
                    return order.vat.get() * this.price.get() * this.amount.get()
                },
                { context: this }
            )
        }

        function Order(includeVat) {
            this.includeVat = observable.box(includeVat)
            this.lines = observable([])

            this.vat = computed(
                function () {
                    if (this.includeVat.get()) return vat.get()
                    return 1
                },
                { context: this }
            )

            this.total = computed(
                function () {
                    return this.lines.reduce(function (acc, order) {
                        return acc + order.total.get()
                    }, 0)
                },
                { context: this }
            )
        }

        let disp
        if (keepObserving) disp = mobx.observe(totalAmount, voidObserver)

        const start = now()

        function setup() {
            for (let i = 0; i < 100; i++) {
                const c = new Order(i % 2 == 0)
                orders.push(c)
                for (let j = 0; j < 100; j++) c.lines.unshift(new OrderLine(c, 5, 5))
            }
        }

        if (usebatch) mobx.transaction(setup)
        else setup()

        t.equal(totalAmount.get(), 375000)

        const initial = now()

        function update() {
            for (let i = 0; i < 50; i++) orders[i].includeVat.set(!orders[i].includeVat.get())
            vat.set(3)
        }

        if (usebatch) mobx.transaction(update)
        else update()

        t.equal(totalAmount.get(), 500000)

        if (keepObserving) disp()

        const end = now()
        log(
            "Order system batched: " +
                usebatch +
                " tracked: " +
                keepObserving +
                "  Started/Updated in " +
                (initial - start) +
                "/" +
                (end - initial) +
                " ms."
        )

        t.end()
    }

    test(`${version} - order system observed`, function (t) {
        order_system_helper(t, false, true)
    })

    test(`${version} - order system batched observed`, function (t) {
        order_system_helper(t, true, true)
    })

    test(`${version} - order system lazy`, function (t) {
        order_system_helper(t, false, false)
    })

    test(`${version} - order system batched lazy`, function (t) {
        order_system_helper(t, true, false)
    })

    test(`${version} - create array`, function (t) {
        gc()
        const a = []
        for (let i = 0; i < 1000; i++) a.push(i)
        const start = now()
        for (let i = 0; i < 1000; i++) observable.array(a)
        log("\nCreate array -  Created in " + (now() - start) + "ms.")
        t.end()
    })

    test(`${version} - create array (fast)`, function (t) {
        gc()
        const a = []
        for (let i = 0; i < 1000; i++) a.push(i)
        const start = now()
        for (let i = 0; i < 1000; i++) mobx.observable.array(a, { deep: false })
        log("\nCreate array (non-recursive)  Created in " + (now() - start) + "ms.")
        t.end()
    })

    test(`${version} - observe and dispose`, t => {
        gc()

        const start = now()
        const a = mobx.observable.box(1)
        const observers = []
        const MAX = 50000

        for (let i = 0; i < MAX * 2; i++) observers.push(mobx.autorun(() => a.get()))
        a.set(2)
        // favorable order
        // + unfavorable order
        for (let i = 0; i < MAX; i++) {
            observers[i]()
            observers[observers.length - 1 - i]()
        }

        log("Observable with many observers  + dispose: " + (now() - start) + "ms")
        t.end()
    })

    test(`${version} - sort`, t => {
        gc()

        function Item(a, b, c) {
            mobx.extendObservable(this, {
                a: a,
                b: b,
                c: c,
                get d() {
                    return this.a + this.b + this.c
                }
            })
        }
        const items = mobx.observable([])

        function sortFn(l, r) {
            items.length // screw all optimizations!
            l.d
            r.d
            if (l.a > r.a) return 1
            if (l.a < r.a) return -1
            if (l.b > r.b) return 1
            if (l.b < r.b) return -1
            if (l.c > r.c) return 1
            if (l.c < r.c) return -1
            return 0
        }

        const sorted = mobx.computed(() => {
            items.slice().sort(sortFn)
        })

        let start = now()
        const MAX = 100000

        const ar = mobx.autorun(() => sorted.get())

        mobx.transaction(() => {
            for (let i = 0; i < MAX; i++) items.push(new Item(i % 10, i % 3, i % 7))
        })

        log("expensive sort: created " + (now() - start))
        start = now()

        for (let i = 0; i < 5; i++) {
            items[i * 1000].a = 7
            items[i * 1100].b = 5
            items[i * 1200].c = 9
        }

        log("expensive sort: updated " + (now() - start))
        start = now()

        ar()

        log("expensive sort: disposed " + (now() - start))

        const plain = mobx.toJS(items, false)
        t.equal(plain.length, MAX)

        start = now()
        for (let i = 0; i < 5; i++) {
            plain[i * 1000].a = 7
            plain.sort(sortFn)
            plain[i * 1100].b = 5
            plain.sort(sortFn)
            plain[i * 1200].c = 9
            plain.sort(sortFn)
        }
        log("native plain sort: updated " + (now() - start))

        t.end()
    })

    test(`${version} - computed temporary memoization`, t => {
        "use strict"
        gc()
        const computeds = []
        for (let i = 0; i < 40; i++) {
            computeds.push(
                mobx.computed(() => (i ? computeds[i - 1].get() + computeds[i - 1].get() : 1))
            )
        }
        const start = now()
        t.equal(computeds[27].get(), 134217728)

        log("computed memoization " + (now() - start) + "ms")
        t.end()
    })

    test(`${version} - Map: initializing`, function (t) {
        gc()
        const iterationsCount = 100000
        let i

        const start = Date.now()
        for (i = 0; i < iterationsCount; i++) {
            mobx.observable.map()
        }
        const end = Date.now()
        log("Initilizing " + iterationsCount + " maps: " + (end - start) + " ms.")
        t.end()
    })

    test(`${version} - Map: looking up properties`, function (t) {
        gc()
        const iterationsCount = 1000
        const propertiesCount = 100
        const map = mobx.observable.map()
        let i
        let p

        for (p = 0; p < propertiesCount; p++) {
            map.set("" + p, p)
        }

        const start = Date.now()
        for (i = 0; i < iterationsCount; i++) {
            for (p = 0; p < propertiesCount; p++) {
                map.get("" + p)
            }
        }
        const end = Date.now()

        log(
            "Looking up " +
                propertiesCount +
                " map properties " +
                iterationsCount +
                " times: " +
                (end - start) +
                " ms."
        )
        t.end()
    })

    test(`${version} - Map: setting and deleting properties`, function (t) {
        gc()
        const iterationsCount = 1000
        const propertiesCount = 100
        const map = mobx.observable.map()
        let i
        let p

        const start = Date.now()
        for (i = 0; i < iterationsCount; i++) {
            for (p = 0; p < propertiesCount; p++) {
                map.set("" + p, i)
            }
            for (p = 0; p < propertiesCount; p++) {
                map.delete("" + p, i)
            }
        }
        const end = Date.now()

        log(
            "Setting and deleting " +
                propertiesCount +
                " map properties " +
                iterationsCount +
                " times: " +
                (end - start) +
                " ms."
        )
        t.end()
    })
}

function now() {
    return +new Date()
}

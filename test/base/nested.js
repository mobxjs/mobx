"use strict"

const mobx = require("../../src/mobx.ts")

test("nested computeds should not run unnecessary", () => {
    function Item(name) {
        mobx.extendObservable(this, {
            name: name,
            get index() {
                const i = store.items.indexOf(this)
                if (i === -1) throw "not found"
                return i
            }
        })
    }

    debugger
    const store = mobx.observable({
        items: [],
        get asString() {
            return this.items.map(item => item.index + ":" + item.name).join(",")
        }
    })
    store.items.push(new Item("item1"))

    const values = []
    mobx.autorun(() => {
        values.push(store.asString)
    })

    store.items.replace([new Item("item2")])

    expect(values).toEqual(["0:item1", "0:item2"])
})

"use strict"

const test = require("tape")
const mobx = require("../")

test("nested computeds should not run unnecessary", t => {
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

    t.deepEqual(values, ["0:item1", "0:item2"])

    t.end()
})

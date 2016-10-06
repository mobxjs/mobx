"use strict"

const test = require('tape')
const mobx = require('../')

test('nested computeds should not run unnecessary', t => {
	function Item(name) {
		mobx.extendObservable(this, {
			name: name,
			get index() {
				const i = store.items.indexOf(this)
				if (i === -1)
					throw "not found"
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

	t.deepEqual(values, [
		"0:item1",
		"0:item2"
	])

	t.end()
})

test('autorunAsync does not call computed values too often', t => {
	let bCalled = 0
	let cCalled = 0
	const a = mobx.observable({
		a: 1,
		get b() {
			bCalled += 1
			return this.a * 2
		},
		get c() {
			cCalled +=1
			return this.b
		}
	})

	const values = []
	const d = mobx.autorunAsync(() => {
		values.push(a.c)
	}, 100)

	setTimeout(() => { a.a = 2}, 30)
	setTimeout(() => { a.a = 3}, 60)
	setTimeout(() => { a.a = 4}, 130)
	setTimeout(() => { a.a = 5}, 160)

	setTimeout(() => {
		t.deepEqual(values, [6, 10])
		t.equal(bCalled, 2) // not 3!
		t.equal(cCalled, 2) // not 3!
		t.end()
	}, 300)
})

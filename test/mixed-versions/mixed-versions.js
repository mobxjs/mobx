const test = require("tape")
const mobx1 = require("../../")
/* istanbul ignore next */
const mobx2 = require("../../lib/mobx.umd.min.js")

test("two versions should not work together if state is not shared", (t) => {
	const a = mobx1.observable({
		x: 1,
	})
	const b = mobx2.observable({
		x: 3,
	})

	values = []
	const d1 = mobx1.autorun(() => {
		values.push(b.x)
	})
	const d2 = mobx2.autorun(() => {
		values.push(a.x)
	})

	a.x = 2
	b.x = 4

	d1()
	d2()

	t.deepEqual(values, [
		3, 1 // no re-runs
	])

	t.end()
})

test("two versions should work together if state is shared", (t) => {
	mobx1.extras.shareGlobalState();
	mobx2.extras.shareGlobalState();

	const a = mobx1.observable({
		x: 1,
		get y() {
			return this.x + b.x
		}
	})
	const b = mobx2.observable({
		x: 3,
		get y() {
			return (this.x + a.x) * 2
		}
	})

	const values = []
	const d1 = mobx1.autorun(() => {
		values.push(a.y - b.y)
	})
	const d2 = mobx2.autorun(() => {
		values.push(b.y - a.y)
	})

	a.x = 2
	b.x = 4

	d1()
	d2()
	a.x = 87
	a.x = 23

	t.deepEqual(values, [
		-4, 4,
		5, -5, // n.b: depending execution order columns could be swapped
		6, -6
	])

	t.end()
})
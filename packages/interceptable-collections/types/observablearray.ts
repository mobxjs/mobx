import { makeNonEnumerable, addHiddenProp } from "./utils"

// Detects bug in safari 9.1.1 (or iOS 9 safari mobile). See #364
const safariPrototypeSetterInheritanceBug = (() => {
	let v = false
	const p = {}
	Object.defineProperty(p, "0", {
		set: () => {
			v = true
		}
	})
	Object.create(p)["0"] = 1
	return v === false
})()

export interface IInterceptableArray<T> extends Array<T> {
	spliceWithArray(index: number, deleteCount?: number, newItems?: T[]): T[]
	reserveArrayBuffer(size: number)
	clear(): T[]
	replace(newItems: T[]): T[]
	find(
		predicate: (item: T, index: number, array: IInterceptableArray<T>) => boolean,
		thisArg?: any,
		fromIndex?: number
	): T
	findIndex(
		predicate: (item: T, index: number, array: IInterceptableArray<T>) => boolean,
		thisArg?: any,
		fromIndex?: number
	): number
	remove(value: T): boolean
}

// Typescript workaround to make sure ObservableArray extends Array
export class StubArray {}
function inherit(ctor, proto) {
	if (typeof Object["setPrototypeOf"] !== "undefined") {
		Object["setPrototypeOf"](ctor.prototype, proto)
	} else if (typeof ctor.prototype.__proto__ !== "undefined") {
		ctor.prototype.__proto__ = proto
	} else {
		ctor["prototype"] = proto
	}
}
inherit(StubArray, Array.prototype)

// Weex freeze Array.prototype
// Make them writeable and configurable in prototype chain
// https://github.com/alibaba/weex/pull/1529
if (Object.isFrozen(Array)) {
	;[
		"constructor",
		"push",
		"shift",
		"concat",
		"pop",
		"unshift",
		"replace",
		"find",
		"findIndex",
		"splice",
		"reverse",
		"sort"
	].forEach(function(key) {
		Object.defineProperty(StubArray.prototype, key, {
			configurable: true,
			writable: true,
			value: Array.prototype[key]
		})
	})
}

export function createInterceptableArrayClass<T>(handlers: {
	afterCreate(...args: any[])
	get(index: number)
	set(index: number, newValue: any)
	splice(index: number, deleteCount: number, elementsToInsert: any[]): any[]
	getValues(writeContext: boolean): any[]
	getSize(writeContext: boolean): number
}): new (...args: any[]) => IInterceptableArray<T> {
	/**
     * This array buffer contains two lists of properties, so that all arrays
     * can recycle their property definitions, which significantly improves performance of creating
     * properties on the fly.
     */
	let interceptableArrayBufferSize = 0

	const clazz = class IInterceptableArray<T> extends StubArray {
		constructor(initialValues: T[] | undefined) {
			super()
			handlers.afterCreate.apply(this, arguments)
			if (safariPrototypeSetterInheritanceBug) {
				// Seems that Safari won't use numeric prototype setter untill any * numeric property is
				// defined on the instance. After that it works fine, even if this property is deleted.
				Object.defineProperty(this, "0", ENTRY_0)
			}
		}

		_setArraySize(newSize: number) {
			if (typeof newSize !== "number" || newSize < 0)
				throw new Error("Out of range: " + newSize)
			let currentSize = this._getSize(true)
			if (newSize === currentSize) return
			else if (newSize > currentSize) {
				const newItems = new Array(newSize - currentSize)
				for (let i = 0; i < newSize - currentSize; i++) newItems[i] = undefined // No Array.fill everywhere...
				this.spliceWithArray(currentSize, 0, newItems)
			} else this.spliceWithArray(newSize, currentSize - newSize)
		}

		_getSize(writeContext: boolean) {
			return handlers.getSize.call(this, writeContext)
		}

		_getValues(writeContext: boolean) {
			return handlers.getValues.call(this, writeContext)
		}

		spliceWithArray(index: number, deleteCount?: number, newItems?: T[]): T[] {
			const length = this._getSize(true)

			if (index === undefined) index = 0
			else if (index > length) index = length
			else if (index < 0) index = Math.max(0, length + index)

			if (arguments.length === 1) deleteCount = length - index
			else if (deleteCount === undefined || deleteCount === null) deleteCount = 0
			else deleteCount = Math.max(0, Math.min(deleteCount, length - index))

			if (newItems === undefined) newItems = []

			return handlers.splice.call(this, index, deleteCount, newItems)
		}

		reserveArrayBuffer(size: number) {
			reserveArrayBuffer(size)
		}

		clear(): T[] {
			return this.splice(0)
		}

		concat(...arrays: T[][]): T[] {
			return Array.prototype.concat.apply(
				this._getValues(false),
				arrays.map(a => (a instanceof clazz ? a._getValues(false) : a))
			)
		}

		replace(newItems: T[]) {
			return this.spliceWithArray(0, this._getSize(true), newItems)
		}

		/**
         * Converts this array back to a (shallow) javascript structure.
         * For a deep clone use mobx.toJS
         */
		toJS(): T[] {
			return (this as any).slice()
		}

		toJSON(): T[] {
			// Used by JSON.stringify
			return this.toJS()
		}

		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
		find(
			predicate: (item: T, index: number, array: IInterceptableArray<T>) => boolean,
			thisArg?,
			fromIndex = 0
		): T | undefined {
			const idx = this.findIndex.apply(this, arguments)
			return idx === -1 ? undefined : this.get(idx)
		}

		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex
		findIndex(
			predicate: (item: T, index: number, array: IInterceptableArray<T>) => boolean,
			thisArg?,
			fromIndex = 0
		): number {
			const items = this._getValues(false),
				l = items.length
			for (let i = fromIndex; i < l; i++)
				if (predicate.call(thisArg, items[i], i, this)) return i
			return -1
		}

		/*
        * functions that do alter the internal structure of the array, (based on lib.es6.d.ts)
        * since these functions alter the inner structure of the array, the have side effects.
        * Because the have side effects, they should not be used in computed function,
        * and for that reason the do not call dependencyState.notifyObserved
        */
		splice(index: number, deleteCount?: number, ...newItems: T[]): T[] {
			switch (arguments.length) {
				case 0:
					return []
				case 1:
					return this.spliceWithArray(index)
				case 2:
					return this.spliceWithArray(index, deleteCount)
			}
			return this.spliceWithArray(index, deleteCount, newItems)
		}

		push(...items: T[]): number {
			this.spliceWithArray(this._getSize(true), 0, items)
			return this._getSize(true)
		}

		pop(): T | undefined {
			return this.splice(Math.max(this._getSize(true) - 1, 0), 1)[0]
		}

		shift(): T | undefined {
			return this.splice(0, 1)[0]
		}

		unshift(...items: T[]): number {
			this.spliceWithArray(0, 0, items)
			return this._getSize(true)
		}

		reverse(): T[] {
			// reverse by default mutates in place before returning the result
			// which makes it both a 'derivation' and a 'mutation'.
			// so we deviate from the default and just make it an dervitation
			const clone = (<any>this).slice()
			return clone.reverse.apply(clone, arguments)
		}

		sort(compareFn?: (a: T, b: T) => number): T[] {
			// sort by default mutates in place before returning the result
			// which goes against all good practices. Let's not change the array in place!
			const clone = (<any>this).slice()
			return clone.sort.apply(clone, arguments)
		}

		remove(value: T): boolean {
			const idx = this._getValues(true).indexOf(value)
			if (idx > -1) {
				this.splice(idx, 1)
				return true
			}
			return false
		}

		// See #734, in case property accessors are unreliable...
		get(index: number): T | undefined {
			if (index < this._getSize(false)) {
				return handlers.get.call(this, index)
			}
			console.warn(
				`[interceptable array] Attempt to read an array index (${index}) that is out of bounds. Please check length first.`
			)
			return undefined
		}

		// See #734, in case property accessors are unreliable...
		set(index: number, newValue: T) {
			const values = this._getValues(true)
			if (index < values.length) {
				handlers.set.call(this, index, newValue)
			} else if (index === values.length) {
				// add a new item
				this.spliceWithArray(index, 0, [newValue])
			} else {
				// out of bounds
				throw new Error(
					`[mobx.array] Index out of bounds, ${index} is larger than ${values.length}`
				)
			}
		}
	}

	Object.defineProperty(clazz.prototype, "length", {
		enumerable: false,
		configurable: true,
		get: function(): number {
			return this._length()
		},
		set: function(newLength: number) {
			this._setArraySize(newLength)
		}
	})

	/**
     * Wrap function from prototype
     */
	;[
		"every",
		"filter",
		"forEach",
		"indexOf",
		"join",
		"lastIndexOf",
		"map",
		"reduce",
		"reduceRight",
		"slice",
		"some",
		"toString",
		"toLocaleString"
	].forEach(funcName => {
		const baseFunc = Array.prototype[funcName]
		if (typeof baseFunc !== "function")
			throw new Error(`Base function not defined on Array prototype: '${funcName}'`)
		addHiddenProp(clazz.prototype, funcName, function() {
			return baseFunc.apply(this._values(false), arguments)
		})
	})

	/**
     * We don't want those to show up in `for (const key in ar)` ...
     */
	makeNonEnumerable(clazz.prototype, [
		"constructor",
		"intercept",
		"observe",
		"clear",
		"concat",
		"get",
		"replace",
		"toJS",
		"toJSON",
		"peek",
		"find",
		"findIndex",
		"splice",
		"spliceWithArray",
		"push",
		"pop",
		"set",
		"shift",
		"unshift",
		"reverse",
		"sort",
		"remove",
		"move",
		"toString",
		"toLocaleString"
	])

	// See #364
	const ENTRY_0 = createArrayEntryDescriptor(0)

	function createArrayEntryDescriptor(index: number) {
		return {
			enumerable: false,
			configurable: false,
			get: function() {
				// TODO: Check `this`?, see #752?
				return this.get(index)
			},
			set: function(value) {
				this.set(index, value)
			}
		}
	}

	function createArrayBufferItem(index: number) {
		Object.defineProperty(clazz.prototype, "" + index, createArrayEntryDescriptor(index))
	}

	function reserveArrayBuffer(max: number) {
		for (let index = interceptableArrayBufferSize; index < max; index++)
			createArrayBufferItem(index)
		interceptableArrayBufferSize = max
	}

	reserveArrayBuffer(1000)

	return clazz as any
}

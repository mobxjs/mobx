import {
	isObject,
	createInstanceofPredicate,
	getNextId,
	makeNonEnumerable,
	Lambda,
	EMPTY_ARRAY,
	addHiddenFinalProp,
	addHiddenProp,
	invariant
} from "../utils/utils"
import { BaseAtom } from "../core/atom"
import { checkIfStateModificationsAreAllowed } from "../core/derivation"
import {
	IInterceptable,
	IInterceptor,
	hasInterceptors,
	registerInterceptor,
	interceptChange
} from "./intercept-utils"
import { IListenable, registerListener, hasListeners, notifyListeners } from "./listen-utils"
import { isSpyEnabled, spyReportStart, spyReportEnd } from "../core/spy"
import { arrayAsIterator, declareIterator } from "../utils/iterable"
import { IEnhancer } from "./modifiers"

import {
	createInterceptableArrayClass,
	IInterceptableArray
} from "../../interceptable-collections/types/observablearray" // TODO: rename

export interface IObservableArray<T> extends IInterceptableArray<T> {
	observe(
		listener: (changeData: IArrayChange<T> | IArraySplice<T>) => void,
		fireImmediately?: boolean
	): Lambda
	intercept(handler: IInterceptor<IArrayWillChange<T> | IArrayWillSplice<T>>): Lambda
	intercept(handler: IInterceptor<IArrayChange<T> | IArraySplice<T>>): Lambda // TODO: remove in 4.0
	intercept<T>(handler: IInterceptor<IArrayChange<T> | IArraySplice<T>>): Lambda // TODO: remove in 4.0
	peek(): T[]
}

// In 3.0, change to IArrayDidChange TODO:
export interface IArrayChange<T> {
	type: "update"
	object: IObservableArray<T>
	index: number
	newValue: T
	oldValue: T
}

// In 3.0, change to IArrayDidSplice TODO:
export interface IArraySplice<T> {
	type: "splice"
	object: IObservableArray<T>
	index: number
	added: T[]
	addedCount: number
	removed: T[]
	removedCount: number
}

export interface IArrayWillChange<T> {
	type: "update"
	object: IObservableArray<T>
	index: number
	newValue: T
}

export interface IArrayWillSplice<T> {
	type: "splice"
	object: IObservableArray<T>
	index: number
	added: T[]
	removedCount: number
}

const MAX_SPLICE_SIZE = 10000 // See e.g. https://github.com/mobxjs/mobx/issues/859

class ObservableArrayAdministration
	implements IInterceptable<IArrayWillChange<any> | IArrayWillSplice<any>>, IListenable {
	atom: BaseAtom
	values: any[] = []
	interceptors = null
	changeListeners = null
	enhancer: (newV: any, oldV: any | undefined) => any
	dehancer: any

	constructor(
		name,
		enhancer: IEnhancer<any>,
		public array: IObservableArray<any>,
		public owned: boolean
	) {
		this.atom = new BaseAtom(name || "ObservableArray@" + getNextId())
		this.enhancer = (newV, oldV) => enhancer(newV, oldV, name + "[..]")
	}

	dehanceValue(value: any): any {
		if (this.dehancer !== undefined) return this.dehancer(value)
		return value
	}

	dehanceValues(values: any[]): any[] {
		if (this.dehancer !== undefined) return values.map(this.dehancer) as any
		return values
	}

	intercept(handler: IInterceptor<IArrayWillChange<any> | IArrayWillSplice<any>>): Lambda {
		return registerInterceptor<IArrayWillChange<any> | IArrayWillSplice<any>>(this, handler)
	}

	observe(
		listener: (changeData: IArrayChange<any> | IArraySplice<any>) => void,
		fireImmediately = false
	): Lambda {
		if (fireImmediately) {
			listener(<IArraySplice<any>>{
				object: this.array,
				type: "splice",
				index: 0,
				added: this.values.slice(),
				addedCount: this.values.length,
				removed: [],
				removedCount: 0
			})
		}
		return registerListener(this, listener)
	}

	getArrayLength(writeContext: boolean): number {
		if (!writeContext) this.atom.reportObserved()
		return this.values.length
	}

	spliceWithArray(index: number, deleteCount: number, newItems: any[]): any[] {
		checkIfStateModificationsAreAllowed(this.atom)

		if (hasInterceptors(this)) {
			const change = interceptChange<IArrayWillSplice<any>>(this as any, {
				object: this.array,
				type: "splice",
				index,
				removedCount: deleteCount,
				added: newItems
			})
			if (!change) return EMPTY_ARRAY
			deleteCount = change.removedCount
			newItems = change.added
		}

		newItems = <any[]>newItems.map(v => this.enhancer(v, undefined))
		const lengthDelta = newItems.length - deleteCount
		this.array.reserveArrayBuffer(length + lengthDelta) // create or remove new entries
		const res = this.spliceItemsIntoValues(index, deleteCount, newItems)

		if (deleteCount !== 0 || newItems.length !== 0) this.notifyArraySplice(index, newItems, res)
		return this.dehanceValues(res)
	}

	spliceItemsIntoValues(index, deleteCount, newItems: any[]): any[] {
		if (newItems.length < MAX_SPLICE_SIZE) {
			return this.values.splice(index, deleteCount, ...newItems)
		} else {
			const res = this.values.slice(index, index + deleteCount)
			this.values = this.values
				.slice(0, index)
				.concat(newItems, this.values.slice(index + deleteCount))
			return res
		}
	}

	notifyArrayChildUpdate<T>(index: number, newValue: T, oldValue: T) {
		const notifySpy = !this.owned && isSpyEnabled()
		const notify = hasListeners(this)
		const change =
			notify || notifySpy
				? {
						object: this.array,
						type: "update",
						index,
						newValue,
						oldValue
					}
				: null

		if (notifySpy) spyReportStart(change)
		this.atom.reportChanged()
		if (notify) notifyListeners(this, change)
		if (notifySpy) spyReportEnd()
	}

	notifyArraySplice<T>(index: number, added: any[], removed: any[]) {
		const notifySpy = !this.owned && isSpyEnabled()
		const notify = hasListeners(this)
		const change =
			notify || notifySpy
				? {
						object: this.array,
						type: "splice",
						index,
						removed,
						added,
						removedCount: removed.length,
						addedCount: added.length
					}
				: null

		if (notifySpy) spyReportStart(change)
		this.atom.reportChanged()
		// conform: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe
		if (notify) notifyListeners(this, change)
		if (notifySpy) spyReportEnd()
	}
}

export const ObservableArray: new <T>(
	initialValues: any[] | undefined,
	enhancer: IEnhancer<T>,
	name?: string,
	owned?: boolean
) => IObservableArray<T> = createInterceptableArrayClass({
	afterCreate(
		initialValues: any[] | undefined,
		enhancer: IEnhancer<any>,
		name = "ObservableArray@" + getNextId(),
		owned = false
	) {
		const adm = new ObservableArrayAdministration(name, enhancer, this as any, owned)
		addHiddenFinalProp(this, "$mobx", adm)

		if (initialValues && initialValues.length) {
			this.spliceWithArray(0, 0, initialValues)
		}
	},
	get(index: number) {
		const impl = <ObservableArrayAdministration>this.$mobx
		if (impl) {
			impl.atom.reportObserved()
			return impl.dehanceValue(impl.values[index])
		}
		return undefined
	},
	set(index: number, newValue: any) {
		const adm = <ObservableArrayAdministration>this.$mobx
		const values = adm.values
		if (index < values.length) {
			// update at index in range
			checkIfStateModificationsAreAllowed(adm.atom)
			const oldValue = values[index]
			if (hasInterceptors(adm)) {
				const change = interceptChange<IArrayWillChange<any>>(adm as any, {
					type: "update",
					object: this as any,
					index,
					newValue
				})
				if (!change) return
				newValue = change.newValue
			}
			newValue = adm.enhancer(newValue, oldValue)
			const changed = newValue !== oldValue
			if (changed) {
				values[index] = newValue
				adm.notifyArrayChildUpdate(index, newValue, oldValue)
			}
		} else if (index === values.length) {
			// add a new item
			adm.spliceWithArray(index, 0, [newValue])
		} else {
			// out of bounds
			throw new Error(
				`[mobx.array] Index out of bounds, ${index} is larger than ${values.length}`
			)
		}
	},
	splice(index: number, deleteCount: number, elementsToInsert: any[]): any[] {
		const adm = <ObservableArrayAdministration>this.$mobx
		return adm.spliceWithArray(index, deleteCount, elementsToInsert)
	},
	getValues(writeContext: boolean): any[] {
		const adm = <ObservableArrayAdministration>this.$mobx
		if (!writeContext) adm.atom.reportObserved()

		adm.atom.reportObserved()
		return adm.dehanceValues(adm.values)
	},
	getSize(writeContext: boolean): number {
		const adm = <ObservableArrayAdministration>this.$mobx
		if (!writeContext) adm.atom.reportObserved()
		return adm.values.length
	}
}) as any

Object.assign(ObservableArray.prototype, {
	intercept(handler: IInterceptor<IArrayWillChange<T> | IArrayWillSplice<T>>): Lambda {
		return this.$mobx.intercept(handler)
	},

	observe(
		listener: (changeData: IArrayChange<T> | IArraySplice<T>) => void,
		fireImmediately = false
	): Lambda {
		return this.$mobx.observe(listener, fireImmediately)
	},

	peek(): any[] {
		this.$mobx.atom.reportObserved()
		return this.$mobx.dehanceValues(this.$mobx.values)
	}
})

declareIterator(ObservableArray.prototype, function() {
	return arrayAsIterator(this.slice())
})

const isObservableArrayAdministration = createInstanceofPredicate(
	"ObservableArrayAdministration",
	ObservableArrayAdministration
)

export function isObservableArray(thing): thing is IObservableArray<any> {
	return isObject(thing) && isObservableArrayAdministration(thing.$mobx)
}

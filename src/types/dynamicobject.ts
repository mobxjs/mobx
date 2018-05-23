import { ObservableValue, UNCHANGED } from "./observablevalue"
import { IAtom, Atom } from "../core/atom"
import { ComputedValue, IComputedValueOptions } from "../core/computedvalue"
import {
    createInstanceofPredicate,
    isObject,
    Lambda,
    getNextId,
    invariant,
    assertPropertyConfigurable,
    isPlainObject,
    fail,
    addHiddenFinalProp,
    isPropertyConfigurable,
    addHiddenProp
} from "../utils/utils"
import {
    hasInterceptors,
    IInterceptable,
    registerInterceptor,
    interceptChange
} from "./intercept-utils"
import { IListenable, registerListener, hasListeners, notifyListeners } from "./listen-utils"
import { isSpyEnabled, spyReportStart, spyReportEnd } from "../core/spy"
import { IEnhancer, referenceEnhancer, deepEnhancer } from "./modifiers"
import { createObservableArray } from "./observablearray"
import { initializeInstance } from "../utils/decorators2"
import { startBatch, endBatch } from "../core/observable"
import { IIsObservableObject, asObservableObject } from "./observableobject"
import { get, set, remove, keys, has } from "../api/object-api"

// TODO: dedupe

export interface IObservableObject {
    "observable-object": IObservableObject
}

export type IObjectDidChange =
    | {
          name: string
          object: any
          type: "add"
          newValue: any
      }
    | {
          name: string
          object: any
          type: "update"
          oldValue: any
          newValue: any
      }
    | {
          name: string
          object: any
          type: "remove"
          oldValue: any
      }

export type IObjectWillChange =
    | {
          object: any
          type: "update" | "add"
          name: string
          newValue: any
      }
    | {
          object: any
          type: "remove"
          name: string
      }

export class DynamicObservableObjectAdministration
    implements IInterceptable<IObjectWillChange>, IListenable {
    keysAtom: IAtom
    // TODO: kep a hasMap like with observable Maps (probably, reuse same mechanism?)
    changeListeners
    interceptors

    constructor(
        public target: any,
        // TODO: split into two; enumerable and non-enumerable members
        public values: { [key: string]: ObservableValue<any> | ComputedValue<any> },
        public name: string,
        public defaultEnhancer: IEnhancer<any>
    ) {
        this.keysAtom = new Atom(name + ".keys")
    }

    read(owner: any, key: string) {
        if (typeof key !== "string" || !this.values.hasOwnProperty(key)) return this.values[key] // might be on prototype
        const observable = this.values[key]
        if (observable) {
            return observable.get()
        } else {
            // lazily create the property if it a dynamic object
            console.log("adding" + key)
            this.addObservableProp(key, undefined)
            return this.values[key].get()
        }
    }

    write(owner: any, key: string, newValue) {
        const instance = this.target
        const observable = this.values[key]
        if (!observable) {
            this.addObservableProp(key, newValue)
            return
        }
        if (observable instanceof ComputedValue) {
            observable.set(newValue)
            return
        }

        // intercept
        if (hasInterceptors(this)) {
            const change = interceptChange<IObjectWillChange>(this, {
                type: "update",
                object: instance,
                name: key,
                newValue
            })
            if (!change) return
            newValue = (change as any).newValue
        }
        newValue = (observable as any).prepareNewValue(newValue)

        // notify spy & observers
        if (newValue !== UNCHANGED) {
            const notify = hasListeners(this)
            const notifySpy = isSpyEnabled()
            const change =
                notify || notifySpy
                    ? {
                          type: "update",
                          object: instance,
                          oldValue: (observable as any).value,
                          name: key,
                          newValue
                      }
                    : null

            if (notifySpy) spyReportStart({ ...change, name: this.name, key })
            ;(observable as ObservableValue<any>).setNewValue(newValue)
            if (notify) notifyListeners(this, change)
            if (notifySpy) spyReportEnd()
        }
    }

    addObservableProp(propName: string, newValue, enhancer: IEnhancer<any> = this.defaultEnhancer) {
        const { target } = this
        assertPropertyConfigurable(target, propName)

        if (hasInterceptors(this)) {
            const change = interceptChange<IObjectWillChange>(this, {
                object: target,
                name: propName,
                type: "add",
                newValue
            })
            if (!change) return
            newValue = (change as any).newValue
        }
        const observable = (this.values[propName] = new ObservableValue(
            newValue,
            enhancer,
            `${this.name}.${propName}`,
            false
        ))
        newValue = (observable as any).value // observableValue might have changed it

        this.notifyPropertyAddition(propName, newValue)
    }

    addComputedProp(
        propertyOwner: any, // where is the property declared?
        propName: string,
        options: IComputedValueOptions<any>
    ) {
        const { target } = this
        options.name = options.name || `${this.name}.${propName}`
        options.context = target
        // TODO: fix
        addHiddenProp(this.values, propName, new ComputedValue(options)) // non enumerable
    }

    remove(key: string) {
        if (!this.values[key]) return
        const { target } = this
        if (hasInterceptors(this)) {
            const change = interceptChange<IObjectWillChange>(this, {
                object: target,
                name: key,
                type: "remove"
            })
            if (!change) return
        }
        try {
            startBatch()
            const notify = hasListeners(this)
            const notifySpy = isSpyEnabled()
            const oldValue = this.values[key].get() // TODO: might not exist on dynamic objects
            this.values[key].set(undefined)
            this.keysAtom.reportChanged()
            delete this.values[key]
            const change =
                notify || notifySpy
                    ? {
                          type: "remove",
                          object: target,
                          oldValue: oldValue,
                          name: key
                      }
                    : null
            if (notifySpy) spyReportStart({ ...change, name: this.name, key })
            if (notify) notifyListeners(this, change)
            if (notifySpy) spyReportEnd()
        } finally {
            endBatch()
        }
    }

    illegalAccess(owner, propName) {
        /**
         * This happens if a property is accessed through the prototype chain, but the property was
         * declared directly as own property on the prototype.
         *
         * E.g.:
         * class A {
         * }
         * extendObservable(A.prototype, { x: 1 })
         *
         * classB extens A {
         * }
         * console.log(new B().x)
         *
         * It is unclear whether the property should be considered 'static' or inherited.
         * Either use `console.log(A.x)`
         * or: decorate(A, { x: observable })
         *
         * When using decorate, the property will always be redeclared as own property on the actual instance
         */
        return fail(
            `Property '${propName}' of '${owner}' was accessed through the prototype chain. Use 'decorate' instead to declare the prop or access it statically through it's owner`
        )
    }

    /**
     * Observes this object. Triggers for the events 'add', 'update' and 'delete'.
     * See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/observe
     * for callback details
     */
    observe(callback: (changes: IObjectDidChange) => void, fireImmediately?: boolean): Lambda {
        process.env.NODE_ENV !== "production" &&
            invariant(
                fireImmediately !== true,
                "`observe` doesn't support the fire immediately property for observable objects."
            )
        return registerListener(this, callback)
    }

    intercept(handler): Lambda {
        return registerInterceptor(this, handler)
    }

    notifyPropertyAddition(key: string, newValue) {
        const notify = hasListeners(this)
        const notifySpy = isSpyEnabled()
        const change =
            notify || notifySpy
                ? {
                      type: "add",
                      object: this.target,
                      name: key,
                      newValue
                  }
                : null

        if (notifySpy) spyReportStart({ ...change, name: this.name, key })
        if (notify) notifyListeners(this, change)
        if (notifySpy) spyReportEnd()
        this.keysAtom.reportChanged()
    }

    getKeys(): string[] {
        this.keysAtom.reportObserved()
        return Object.keys(this.values).filter(key => this.values[key] instanceof ObservableValue)
    }
}

const objectProxyTraps: ProxyHandler<any> = {
    get(target: IIsObservableObject, name: string) {
        // TODO: use symbol for  "__mobxDidRunLazyInitializers" and "$mobx", and remove these checks
        if (name === "$mobx" || name === "constructor" || name === "__mobxDidRunLazyInitializers")
            return target[name]
        const observable = target.$mobx.values[name]
        if (observable instanceof Atom) return observable.get()
        // make sure we start listening to future keys
        // TODO: optimization: has here is inefficient and will react to any key change,
        // better: keep a set of observables expressing the existince of a key, like in
        // observable maps
        has(target, name)
        return undefined
    },
    set(target: IIsObservableObject, name: string, value: any) {
        set(target, name, value)
        return true
        // const adm = target.$mobx
        // if (typeof name === "string" && name !== "constructor" && name !== "$mobx") {
        //     adm.write(target, name, value)
        //     return true
        // }
        // return fail(`Cannot reassign ${name}`)
    },
    deleteProperty(target: IIsObservableObject, name: string) {
        remove(target, name)
        // const adm = target.$mobx
        // if (name === "$mobx") return fail(`Cannot reassign $mobx`)
        // adm.remove(name)
        return true
    },
    ownKeys(target: IIsObservableObject) {
        return keys(target)
        // const adm = target.$mobx
        // return adm.getKeys()
    }
}

export function createDynamicObservableObject(base) {
    const proxy = new Proxy(base, objectProxyTraps)
    base.$mobx.proxy = proxy
    return proxy
}

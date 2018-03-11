import { ObservableValue, UNCHANGED } from "./observablevalue"
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
    isPropertyConfigurable
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
import { IObservableArray, createObservableArray } from "./observablearray"
import { initializeInstance } from "../utils/decorators2"
import { startBatch, endBatch } from "../core/observable"
import { IIsObservableObject } from "./observableobject"

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

export class ObservableObjectAdministration
    implements IInterceptable<IObjectWillChange>, IListenable {
    keys: IObservableArray<string>
    changeListeners
    interceptors

    constructor(
        public values: { [key: string]: ObservableValue<any> | ComputedValue<any> },
        public target,
        public name: string,
        public defaultEnhancer: IEnhancer<any>
    ) {
        this.keys = <any>createObservableArray([], referenceEnhancer, `keys(${this.name})`, true)
    }

    read(owner: any, key: string) {
        if (this.target !== owner) {
            this.illegalAccess(owner, key)
            return
        }
        const observable = this.values[key]
        return observable ? observable.get() : undefined
    }

    write(owner: any, key: string, newValue) {
        const instance = this.target
        if (instance !== owner) {
            this.illegalAccess(owner, key)
            return
        }
        const observable = this.values[key]
        if (!observable) return this.addProp(key, newValue)
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

    addProp(propName: string, newValue: any) {
        const { target, values } = this
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
        const observable = (values[propName] = new ObservableValue(
            newValue,
            this.defaultEnhancer,
            `${this.name}.${propName}`,
            false
        ))
        newValue = (observable as any).value // observableValue might have changed it

        this.keys.push(propName)
        notifyPropertyAddition(this, target, propName, newValue)
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
            const oldValue = this.values[key].get()
            if (this.keys) this.keys.remove(key)
            delete this.values[key]
            delete this.target[key]
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

    getKeys(): string[] {
        return this.keys!.slice() // TODO, optimize, don't slice here!
    }
}

const objectProxyTraps: ProxyHandler<any> = {
    get(target: IIsObservableObject, name: string) {
        const adm = target.$mobx
        if (name === "$mobx") return adm
        return adm.read(this, name)
    },
    set(target: IIsObservableObject, name: string, value: any) {
        const adm = target.$mobx
        if (name === "$mobx") return fail(`Cannot reassign $mobx`)
        adm.write(this, name, value)
        return true
    },
    deleteProperty(target: IIsObservableObject, name: string) {
        const adm = target.$mobx
        if (name === "$mobx") return fail(`Cannot reassign $mobx`)
        adm.remove(name)
        return true
    }
}

export function createDynamicObservableObject(
    source,
    name,
    defaultEnhancer: IEnhancer<any> = deepEnhancer
) {
    // TODO: check not observable already
    const target = {}
    const proxy = new Proxy(target, objectProxyTraps)
    const adm = new ObservableObjectAdministration(target, name, defaultEnhancer)
    addHiddenFinalProp(target, "$mobx", adm)
    // TODO, copy props, including getters
    return proxy
}

export function defineComputedProperty(
    valueOwner: any, // which objects holds the observable and provides `this` context?
    propertyOwner: any, // where is the property declared?
    propName: string,
    options: IComputedValueOptions<any>
) {
    const adm = asObservableObject(valueOwner)
    options.name = options.name || `${adm.name}.${propName}`
    options.context = valueOwner
    adm.values[propName] = new ComputedValue(options)
    if (propertyOwner === valueOwner || isPropertyConfigurable(propertyOwner, propName))
        Object.defineProperty(propertyOwner, propName, generateComputedPropConfig(propName))
}

const observablePropertyConfigs = {}
const computedPropertyConfigs = {}

export function generateObservablePropConfig(propName) {
    return (
        observablePropertyConfigs[propName] ||
        (observablePropertyConfigs[propName] = {
            configurable: true,
            enumerable: true,
            get() {
                return this.$mobx.read(this, propName)
            },
            set(v) {
                this.$mobx.write(this, propName, v)
            }
        })
    )
}

function getAdministrationForComputedPropOwner(owner: any): ObservableObjectAdministration {
    const adm = owner.$mobx
    if (!adm) {
        // because computed props are declared on proty,
        // the current instance might not have been initialized yet
        initializeInstance(owner)
        return owner.$mobx
    }
    return adm
}

export function generateComputedPropConfig(propName) {
    return (
        computedPropertyConfigs[propName] ||
        (computedPropertyConfigs[propName] = {
            configurable: true,
            enumerable: false,
            get() {
                return getAdministrationForComputedPropOwner(this).read(this, propName)
            },
            set(v) {
                getAdministrationForComputedPropOwner(this).write(this, propName, v)
            }
        })
    )
}

function notifyPropertyAddition(
    adm: ObservableObjectAdministration,
    object,
    key: string,
    newValue
) {
    const notify = hasListeners(adm)
    const notifySpy = isSpyEnabled()
    const change =
        notify || notifySpy
            ? {
                  type: "add",
                  object,
                  name: key,
                  newValue
              }
            : null

    if (notifySpy) spyReportStart({ ...change, name: adm.name, key })
    if (notify) notifyListeners(adm, change)
    if (notifySpy) spyReportEnd()
}

const isObservableObjectAdministration = createInstanceofPredicate(
    "ObservableObjectAdministration",
    ObservableObjectAdministration
)

export function isObservableObject(thing: any): thing is IObservableObject {
    if (isObject(thing)) {
        // Initializers run lazily when transpiling to babel, so make sure they are run...
        initializeInstance(thing)
        return isObservableObjectAdministration((thing as any).$mobx)
    }
    return false
}

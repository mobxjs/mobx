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
    keys: undefined | IObservableArray<string>
    changeListeners
    interceptors

    constructor(
        public target: any,
        public values: { [key: string]: ObservableValue<any> | ComputedValue<any> },
        public name: string,
        public defaultEnhancer: IEnhancer<any>,
        public isProxied: boolean
    ) {}

    read(owner: any, key: string) {
        if (!this.isProxied && this.target !== owner) {
            // TODO: remove isProxied check?
            this.illegalAccess(owner, key)
            return
        }
        const observable = this.values[key]
        if (observable) {
            // todo, remove this check
            if (typeof observable.get !== "function") fail("not an observable " + key)
            return observable.get()
        } else {
            // might be added in the future
            if (this.isProxied) {
                this.getKeys().length // notitify observabed
                return undefined
            } else fail(`Not an observable property ${key}`)
        }
    }

    write(owner: any, key: string, newValue) {
        const instance = this.target
        if (!this.isProxied && instance !== owner) {
            // TODO: remove isProxied check?
            this.illegalAccess(owner, key)
            return
        }
        const observable = this.values[key]
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

        if (!this.isProxied)
            Object.defineProperty(target, propName, generateObservablePropConfig(propName))
        if (this.keys) this.keys.push(propName)
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
        this.values[propName] = new ComputedValue(options)
        if (
            !this.isProxied &&
            (propertyOwner === target || isPropertyConfigurable(propertyOwner, propName))
        )
            Object.defineProperty(propertyOwner, propName, generateComputedPropConfig(propName))
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
            if (this.keys) this.keys.remove(key)
            delete this.values[key]
            if (!this.isProxied) delete this.target[key]
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
    }

    getKeys(): string[] {
        if (this.keys === undefined) {
            this.keys = <any>createObservableArray(
                Object.keys(this.values).filter(key => this.values[key] instanceof ObservableValue),
                referenceEnhancer,
                `keys(${this.name})`,
                true
            )
        }
        return this.keys!.slice() // TODO, optimize, don't slice here!
    }
}

export interface IIsObservableObject {
    $mobx: ObservableObjectAdministration
}

export function asObservableObject(
    target: any,
    name: string = "",
    defaultEnhancer: IEnhancer<any> = deepEnhancer
): ObservableObjectAdministration {
    if (Object.prototype.hasOwnProperty.call(target, "$mobx")) return target.$mobx

    process.env.NODE_ENV !== "production" &&
        invariant(
            Object.isExtensible(target),
            "Cannot make the designated object observable; it is not extensible"
        )
    if (!isPlainObject(target))
        name = (target.constructor.name || "ObservableObject") + "@" + getNextId()
    if (!name) name = "ObservableObject@" + getNextId() // TODO: change name to record

    const adm = new ObservableObjectAdministration(target, {}, name, defaultEnhancer, false)
    addHiddenFinalProp(target, "$mobx", adm)
    return adm
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

const objectProxyTraps: ProxyHandler<any> = {
    get(target: IIsObservableObject, name: string) {
        const adm = target.$mobx
        if (name === "$mobx") return adm
        // TODO: use symbol for  "__mobxDidRunLazyInitializers" and "$mobx", and remove these checks
        if (
            typeof name === "string" &&
            name !== "constructor" &&
            name !== "__mobxDidRunLazyInitializers"
        )
            return adm.read(target, name)
        return target[name]
    },
    set(target: IIsObservableObject, name: string, value: any) {
        const adm = target.$mobx
        if (typeof name === "string" && name !== "constructor" && name !== "$mobx") {
            adm.write(target, name, value)
            return true
        }
        return fail(`Cannot reassign ${name}`)
    },
    deleteProperty(target: IIsObservableObject, name: string) {
        const adm = target.$mobx
        if (name === "$mobx") return fail(`Cannot reassign $mobx`)
        adm.remove(name)
        return true
    }
}

export function createDynamicObservableObject(
    name,
    defaultEnhancer: IEnhancer<any> = deepEnhancer
) {
    const values = {}
    const proxy = new Proxy(values, objectProxyTraps)
    const adm = new ObservableObjectAdministration(
        proxy,
        values,
        name || "ObservableObject@" + getNextId(),
        defaultEnhancer,
        true
    )
    addHiddenFinalProp(values, "$mobx", adm)
    return proxy
}

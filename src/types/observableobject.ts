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
import { IEnhancer, referenceEnhancer } from "./modifiers"
import { ObservableArray, IObservableArray } from "./observablearray"
import { initializeInstance } from "../utils/decorators2"

export interface IObservableObject {
    "observable-object": IObservableObject
}

// TODO: In 3.0, change to IObjectDidChange
export interface IObjectChange {
    name: string
    object: any
    type: "update" | "add"
    oldValue?: any
    newValue: any
}

export interface IObjectWillChange {
    object: any
    type: "update" | "add"
    name: string
    newValue: any
}

export class ObservableObjectAdministration
    implements IInterceptable<IObjectWillChange>, IListenable {
    values: { [key: string]: ObservableValue<any> | ComputedValue<any> } = {}
    keys: undefined | IObservableArray<string>
    changeListeners
    interceptors

    constructor(public target: any, public name: string) {}

    read(owner: any, key: string) {
        if (this.target !== owner) {
            this.illegalAccess(owner, key)
            return
        }
        return this.values[key].get()
    }

    write(owner: any, key: string, newValue) {
        const instance = this.target
        if (instance !== owner) {
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
            newValue = change.newValue
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
    observe(callback: (changes: IObjectChange) => void, fireImmediately?: boolean): Lambda {
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
        if (this.keys === undefined) {
            this.keys = <any>new ObservableArray(
                Object.keys(this.values),
                referenceEnhancer,
                `keys(${this.name})`,
                true
            )
        }
        return this.keys!.slice()
    }
}

export interface IIsObservableObject {
    $mobx: ObservableObjectAdministration
}

export function asObservableObject(target, name?: string): ObservableObjectAdministration {
    if (
        Object.prototype.hasOwnProperty.call(target, "$mobx") // TODO: needs own property check?
    )
        return (target as any).$mobx

    process.env.NODE_ENV !== "production" &&
        invariant(
            Object.isExtensible(target),
            "Cannot make the designated object observable; it is not extensible"
        )
    if (!isPlainObject(target))
        name = (target.constructor.name || "ObservableObject") + "@" + getNextId()
    if (!name) name = "ObservableObject@" + getNextId()

    const adm = new ObservableObjectAdministration(target, name)
    addHiddenFinalProp(target, "$mobx", adm)
    return adm
}

export function defineObservableProperty(
    target: any,
    propName: string,
    newValue,
    enhancer: IEnhancer<any>
) {
    const adm = asObservableObject(target)
    assertPropertyConfigurable(target, propName)

    if (hasInterceptors(adm)) {
        const change = interceptChange<IObjectWillChange>(adm, {
            object: target,
            name: propName,
            type: "add",
            newValue
        })
        if (!change) return
        newValue = change.newValue
    }
    const observable = (adm.values[propName] = new ObservableValue(
        newValue,
        enhancer,
        `${adm.name}.${propName}`,
        false
    ))
    newValue = (observable as any).value // observableValue might have changed it

    Object.defineProperty(target, propName, generateObservablePropConfig(propName))
    if (adm.keys) adm.keys.push(propName)
    notifyPropertyAddition(adm, target, propName, newValue)
}

export function defineComputedProperty(
    valueOwner: any, // which objects holds the observable and provides `this` context?
    propertyOwner: any, // where is the property declared?
    propName: string,
    options: IComputedValueOptions<any>
) {
    const adm = asObservableObject(valueOwner, "")
    options.name = options.name || `${adm.name}.${propName}`
    options.context = valueOwner
    adm.values[propName] = new ComputedValue(options)
    // TODO: isPropertyConfigurable needed / best check?
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

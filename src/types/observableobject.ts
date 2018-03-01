import { ObservableValue, UNCHANGED } from "./observablevalue"
import { isComputedValue, ComputedValue, IComputedValueOptions } from "../core/computedvalue"
import {
    createInstanceofPredicate,
    isObject,
    Lambda,
    getNextId,
    invariant,
    assertPropertyConfigurable,
    isPlainObject,
    addHiddenFinalProp
} from "../utils/utils"
import { runLazyInitializers } from "../utils/decorators"
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
    if (isObservableObject(target) && Object.prototype.hasOwnProperty.call(target, "$mobx"))
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
    adm: ObservableObjectAdministration,
    propName: string,
    newValue,
    enhancer: IEnhancer<any>
) {
    assertPropertyConfigurable(adm.target, propName)

    if (hasInterceptors(adm)) {
        const change = interceptChange<IObjectWillChange>(adm, {
            object: adm.target,
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

    Object.defineProperty(adm.target, propName, generateObservablePropConfig(propName))
    if (adm.keys) adm.keys.push(propName)
    notifyPropertyAddition(adm, adm.target, propName, newValue)
}

export function defineComputedProperty(
    adm: ObservableObjectAdministration,
    propName: string,
    options: IComputedValueOptions<any>,
    asInstanceProperty: boolean
) {
    if (asInstanceProperty) assertPropertyConfigurable(adm.target, propName)
    options.name = options.name || `${adm.name}.${propName}`
    options.context = adm.target
    adm.values[propName] = new ComputedValue(options)
    if (asInstanceProperty) {
        Object.defineProperty(adm.target, propName, generateComputedPropConfig(propName))
    }
}

const observablePropertyConfigs = {}
const computedPropertyConfigs = {}

export function generateObservablePropConfig(propName) {
    return (
        observablePropertyConfigs[propName] ||
        (observablePropertyConfigs[propName] = {
            configurable: true,
            enumerable: true,
            get: function() {
                return this.$mobx.values[propName].get()
            },
            set: function(v) {
                setPropertyValue(this, propName, v)
            }
        })
    )
}

export function generateComputedPropConfig(propName) {
    return (
        computedPropertyConfigs[propName] ||
        (computedPropertyConfigs[propName] = {
            configurable: true,
            enumerable: false,
            get: function() {
                return this.$mobx.values[propName].get()
            },
            set: function(v) {
                return this.$mobx.values[propName].set(v)
            }
        })
    )
}

export function setPropertyValue(instance, key: string, newValue) {
    const adm = instance.$mobx as ObservableObjectAdministration
    const observable = adm.values[key]

    // intercept
    if (hasInterceptors(adm)) {
        const change = interceptChange<IObjectWillChange>(adm, {
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
        const notify = hasListeners(adm)
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

        if (notifySpy) spyReportStart({ ...change, name: adm.name, key })
        observable.setNewValue(newValue)
        if (notify) notifyListeners(adm, change)
        if (notifySpy) spyReportEnd()
    }
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
        runLazyInitializers(thing)
        return isObservableObjectAdministration((thing as any).$mobx)
    }
    return false
}

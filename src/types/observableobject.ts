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

    read(owner: any, propName: string) {
        if (owner !== this.target) {
            return fail("illegal state!")
            // this.cloneInto(owner)
            // return owner[propName]
        }
        return this.values[propName].get()
    }

    write(owner: any, key: string, newValue) {
        const instance = this.target
        if (instance !== owner) {
            return fail("illegal state!")
            // this.cloneInto(owner)
            // return (owner[key] = newValue)
        }
        const observable = this.values[key]

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

    // TODO: remove this func again
    // cloneInto(instance) {
    //     // if there instance we read / write from is not the target of this administration,
    //     // it means that twe are currently reading through the prototype chain
    //     // for enumerability etc we want all properties on the actual instance, so let's move them!

    //     // TODO FIX: potential bug, what if we used keys / intercept / observe, before reading any value?
    //     const adm = asObservableObject(instance)
    //     for (let key in this.values) {
    //         const observable = this.values[key]
    //         if (observable instanceof ObservableValue) {
    //             const initializer = this.initializers && this.initializers[key]
    //             defineObservableProperty(
    //                 adm,
    //                 key,
    //                 initializer ? initializer() : observable.value,
    //                 observable.enhancer
    //             )
    //         } else {
    //             // TODO: copy all options
    //             defineComputedProperty(
    //                 adm,
    //                 key,
    //                 { get: observable.derivation },
    //                 true /* TODO or..? */
    //             )
    //         }
    //     }
    // }

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
                return this.$mobx.read(this, propName)
            },
            set: function(v) {
                this.$mobx.write(this, propName, v)
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
                return this.$mobx.read(propName)
            },
            set: function(v) {
                return this.$mobx.values[propName].set(v)
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
        runLazyInitializers(thing)
        return isObservableObjectAdministration((thing as any).$mobx)
    }
    return false
}

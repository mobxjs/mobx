import {
    $mobx,
    Atom,
    ComputedValue,
    IAtom,
    IComputedValueOptions,
    IEnhancer,
    IInterceptable,
    IListenable,
    Lambda,
    ObservableValue,
    addHiddenProp,
    assertPropertyConfigurable,
    createInstanceofPredicate,
    deepEnhancer,
    endBatch,
    getNextId,
    hasInterceptors,
    hasListeners,
    interceptChange,
    isObject,
    isPlainObject,
    isSpyEnabled,
    notifyListeners,
    referenceEnhancer,
    registerInterceptor,
    registerListener,
    spyReportEnd,
    spyReportStart,
    startBatch,
    stringifyKey,
    globalState,
    ADD,
    UPDATE,
    die,
    defineProperty,
    hasProp
} from "../internal"

export type IObjectDidChange<T = any> = {
    observableKind: "object"
    name: PropertyKey
    object: T
    debugObjectName: string
} & (
    | {
          type: "add"
          newValue: any
      }
    | {
          type: "update"
          oldValue: any
          newValue: any
      }
    | {
          type: "remove"
          oldValue: any
      }
)

export type IObjectWillChange<T = any> =
    | {
          object: T
          type: "update" | "add"
          name: PropertyKey
          newValue: any
      }
    | {
          object: T
          type: "remove"
          name: PropertyKey
      }

const REMOVE = "remove"

export class ObservableObjectAdministration
    implements IInterceptable<IObjectWillChange>, IListenable {
    keysAtom_: IAtom
    changeListeners_
    interceptors_
    proxy_: any
    private pendingKeys_: undefined | Map<PropertyKey, ObservableValue<boolean>>
    private keysValue_: PropertyKey[] = []
    private isStaledKeysValue_ = true

    constructor(
        public target_: any,
        public values_ = new Map<PropertyKey, ObservableValue<any> | ComputedValue<any>>(),
        public name_: string,
        public defaultEnhancer_: IEnhancer<any>
    ) {
        this.keysAtom_ = new Atom(name_ + ".keys")
    }

    read_(key: PropertyKey) {
        return this.values_.get(key)!.get()
    }

    write_(key: PropertyKey, newValue) {
        const instance = this.target_
        const observable = this.values_.get(key)
        if (observable instanceof ComputedValue) {
            observable.set(newValue)
            return
        }

        // intercept
        if (hasInterceptors(this)) {
            const change = interceptChange<IObjectWillChange>(this, {
                type: UPDATE,
                object: this.proxy_ || instance,
                name: key,
                newValue
            })
            if (!change) return
            newValue = (change as any).newValue
        }
        newValue = (observable as any).prepareNewValue_(newValue)

        // notify spy & observers
        if (newValue !== globalState.UNCHANGED) {
            const notify = hasListeners(this)
            const notifySpy = __DEV__ && isSpyEnabled()
            const change: IObjectDidChange | null =
                notify || notifySpy
                    ? {
                          type: UPDATE,
                          observableKind: "object",
                          debugObjectName: this.name_,
                          object: this.proxy_ || instance,
                          oldValue: (observable as any).value_,
                          name: key,
                          newValue
                      }
                    : null

            if (__DEV__ && notifySpy) spyReportStart(change!)
            ;(observable as ObservableValue<any>).setNewValue_(newValue)
            if (notify) notifyListeners(this, change)
            if (__DEV__ && notifySpy) spyReportEnd()
        }
    }

    has_(key: PropertyKey) {
        const map = this.pendingKeys_ || (this.pendingKeys_ = new Map())
        let entry = map.get(key)
        if (entry) return entry.get()
        else {
            const exists = !!this.values_.get(key)
            // Possible optimization: Don't have a separate map for non existing keys,
            // but store them in the values map instead, using a special symbol to denote "not existing"
            entry = new ObservableValue(
                exists,
                referenceEnhancer,
                `${this.name_}.${stringifyKey(key)}?`,
                false
            )
            map.set(key, entry)
            return entry.get() // read to subscribe
        }
    }

    addObservableProp_(
        propName: PropertyKey,
        newValue,
        enhancer: IEnhancer<any> = this.defaultEnhancer_
    ) {
        const { target_: target } = this
        if (__DEV__) assertPropertyConfigurable(target, propName)

        if (hasInterceptors(this)) {
            const change = interceptChange<IObjectWillChange>(this, {
                object: this.proxy_ || target,
                name: propName,
                type: ADD,
                newValue
            })
            if (!change) return
            newValue = (change as any).newValue
        }
        const observable = new ObservableValue(
            newValue,
            enhancer,
            `${this.name_}.${stringifyKey(propName)}`,
            false
        )
        this.values_.set(propName, observable)
        newValue = (observable as any).value_ // observableValue might have changed it

        defineProperty(target, propName, generateObservablePropConfig(propName))
        this.notifyPropertyAddition_(propName, newValue)
    }

    addComputedProp_(
        propertyOwner: any, // where is the property declared?
        propName: PropertyKey,
        options: IComputedValueOptions<any>
    ) {
        const { target_: target } = this
        options.name = options.name || `${this.name_}.${stringifyKey(propName)}`
        options.context = this.proxy_ || target
        this.values_.set(propName, new ComputedValue(options))
        // Doesn't seem we need this condition:
        // if (propertyOwner === target || isPropertyConfigurable(propertyOwner, propName))
        defineProperty(propertyOwner, propName, generateComputedPropConfig(propName))
    }

    remove_(key: PropertyKey) {
        if (!this.values_.has(key)) return
        const { target_: target } = this
        if (hasInterceptors(this)) {
            const change = interceptChange<IObjectWillChange>(this, {
                object: this.proxy_ || target,
                name: key,
                type: REMOVE
            })
            if (!change) return
        }
        try {
            startBatch()
            const notify = hasListeners(this)
            const notifySpy = __DEV__ && isSpyEnabled()
            const oldObservable = this.values_.get(key)
            const oldValue = oldObservable && oldObservable.get()
            oldObservable && oldObservable.set(undefined)
            // notify key and keyset listeners
            this.reportKeysChanged()
            this.values_.delete(key)
            if (this.pendingKeys_) {
                const entry = this.pendingKeys_.get(key)
                if (entry) entry.set(false)
            }
            // delete the prop
            delete this.target_[key]
            const change: IObjectDidChange | null =
                notify || notifySpy
                    ? ({
                          type: REMOVE,
                          observableKind: "object",
                          object: this.proxy_ || target,
                          debugObjectName: this.name_,
                          oldValue: oldValue,
                          name: key
                      } as const)
                    : null
            if (__DEV__ && notifySpy) spyReportStart(change!)
            if (notify) notifyListeners(this, change)
            if (__DEV__ && notifySpy) spyReportEnd()
        } finally {
            endBatch()
        }
    }

    /**
     * Observes this object. Triggers for the events 'add', 'update' and 'delete'.
     * See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/observe
     * for callback details
     */
    observe_(callback: (changes: IObjectDidChange) => void, fireImmediately?: boolean): Lambda {
        if (__DEV__ && fireImmediately === true)
            die("`observe` doesn't support the fire immediately property for observable objects.")
        return registerListener(this, callback)
    }

    intercept_(handler): Lambda {
        return registerInterceptor(this, handler)
    }

    notifyPropertyAddition_(key: PropertyKey, newValue) {
        const notify = hasListeners(this)
        const notifySpy = __DEV__ && isSpyEnabled()
        const change: IObjectDidChange | null =
            notify || notifySpy
                ? ({
                      type: ADD,
                      observableKind: "object",
                      debugObjectName: this.name_,
                      object: this.proxy_ || this.target_,
                      name: key,
                      newValue
                  } as const)
                : null

        if (__DEV__ && notifySpy) spyReportStart(change!)
        if (notify) notifyListeners(this, change)
        if (__DEV__ && notifySpy) spyReportEnd()
        if (this.pendingKeys_) {
            const entry = this.pendingKeys_.get(key)
            if (entry) entry.set(true)
        }
        this.reportKeysChanged()
    }

    getKeys_(): PropertyKey[] {
        this.keysAtom_.reportObserved()
        if (!this.isStaledKeysValue_) {
            return this.keysValue_
        }
        // return Reflect.ownKeys(this.values) as any
        this.keysValue_ = []
        for (const [key, value] of this.values_)
            if (value instanceof ObservableValue) this.keysValue_.push(key)
        if (__DEV__) Object.freeze(this.keysValue_)
        this.isStaledKeysValue_ = false
        return this.keysValue_
    }

    private reportKeysChanged() {
        this.isStaledKeysValue_ = true
        this.keysAtom_.reportChanged()
    }
}

export interface IIsObservableObject {
    $mobx: ObservableObjectAdministration
}

export function asObservableObject(
    target: any,
    name: PropertyKey = "",
    defaultEnhancer: IEnhancer<any> = deepEnhancer
): ObservableObjectAdministration {
    if (hasProp(target, $mobx)) return target[$mobx]

    if (__DEV__ && !Object.isExtensible(target))
        die("Cannot make the designated object observable; it is not extensible")

    if (!name) {
        if (isPlainObject(target)) {
            name = "ObservableObject@" + getNextId()
        } else {
            name = (target.constructor.name || "ObservableObject") + "@" + getNextId()
        }
    }

    const adm = new ObservableObjectAdministration(
        target,
        new Map(),
        stringifyKey(name),
        defaultEnhancer
    )
    addHiddenProp(target, $mobx, adm)
    return adm
}

const observablePropertyConfigs = Object.create(null)
const computedPropertyConfigs = Object.create(null)

export function generateObservablePropConfig(propName) {
    return (
        observablePropertyConfigs[propName] ||
        (observablePropertyConfigs[propName] = {
            configurable: true,
            enumerable: true,
            get() {
                return this[$mobx].read_(propName)
            },
            set(v) {
                this[$mobx].write_(propName, v)
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
            get() {
                return this[$mobx].read_(propName)
            },
            set(v) {
                this[$mobx].write_(propName, v)
            }
        })
    )
}

const isObservableObjectAdministration = createInstanceofPredicate(
    "ObservableObjectAdministration",
    ObservableObjectAdministration
)

export function isObservableObject(thing: any): boolean {
    if (isObject(thing)) {
        return isObservableObjectAdministration((thing as any)[$mobx])
    }
    return false
}

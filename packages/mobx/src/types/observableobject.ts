import {
    $mobx,
    Atom,
    Annotation,
    ComputedValue,
    IAtom,
    IComputedValueOptions,
    IEnhancer,
    IInterceptable,
    IListenable,
    Lambda,
    ObservableValue,
    addHiddenProp,
    createInstanceofPredicate,
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
    observable,
    ADD,
    UPDATE,
    die,
    hasProp,
    getDescriptor,
    isFunction,
    storedAnnotationsSymbol,
    ownKeys,
    reflectDefineProperty,
    isOverride
} from "../internal"

export const appliedAnnotationsSymbol = Symbol("mobx-applied-annotations")

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

/**
 * Most of the methods return false when property is not configurable to remain compatible with Reflect API,
 * Consumers can use assertPropertyConfigurable(adm, key) before calling the method
 */
export class ObservableObjectAdministration
    implements IInterceptable<IObjectWillChange>, IListenable {
    keysAtom_: IAtom
    changeListeners_
    interceptors_
    proxy_: any
    isPlainObject_: boolean
    private pendingKeys_: undefined | Map<PropertyKey, ObservableValue<boolean>>

    constructor(
        public target_: any,
        public values_ = new Map<PropertyKey, ObservableValue<any> | ComputedValue<any>>(),
        public name_: string,
        public defaultAnnotation_: Annotation = observable
    ) {
        this.keysAtom_ = new Atom(name_ + ".keys")
        this.isPlainObject_ = isPlainObject(this.target_)
        if (__DEV__) {
            // Prepare structure for tracking which fields were already annotated
            addHiddenProp(this, appliedAnnotationsSymbol, {})
            // TODO validate annotation
        }
    }

    getObservablePropValue_(key: PropertyKey) {
        return this.values_.get(key)!.get()
    }

    setObservablePropValue_(key: PropertyKey, newValue) {
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

    set_(key: PropertyKey, value: any): boolean {
        // faster than this.has_ - no need to subscribe for key here
        if (hasProp(this.target_, key)) {
            this.target_[key] = value
        } else {
            return this.extend_(
                key,
                { value, enumerable: true, writable: true, configurable: true },
                this.defaultAnnotation_
            )
        }
        return true
    }

    has_(key: PropertyKey): boolean {
        // TODO: do this only in derivation, otherwise return hasProp(this.target_, key)
        this.pendingKeys_ ||= new Map()
        let entry = this.pendingKeys_.get(key)
        if (!entry) {
            entry = new ObservableValue(
                hasProp(this.target_, key),
                referenceEnhancer,
                `${this.name_}.${stringifyKey(key)}?`,
                false
            )
            this.pendingKeys_.set(key, entry)
        }
        return entry.get()
    }

    make_(key: PropertyKey, annotation /* TODO type */): boolean {
        if (annotation === false) {
            return true
        }
        if (annotation === true) {
            annotation = this.defaultAnnotation_
        }
        if (__DEV__ && !isFunction(annotation.make_)) {
            die(`Unable to make observable: Invalid annotation`)
        }
        assertNotAnnotated(this, annotation, key)
        const annotated = annotation.make_(this, key)
        if (annotated) {
            recordAnnotationApplied(this, annotation, key)
        } else if (!annotation.isDecorator_) {
            // Throw on missing key, except for decorators:
            // Decorator annotations are collected from whole prototype chain.
            // When called from super() some props may not exist yet.
            // However we don't have to worry about missing prop,
            // because the decorator must have been applied to something.
            // TODO improve error
            die(1, key)
        }
        return annotated
    }

    extend_(key: PropertyKey, descriptor: PropertyDescriptor, annotation /* TODO type */): boolean {
        if (annotation === false) {
            return this.defineProperty_(key, descriptor)
        }
        if (annotation === true) {
            annotation = this.defaultAnnotation_
        }
        if (__DEV__ && !isFunction(annotation.extend_)) {
            die(`Unable to extend observable: Invalid annotation`)
        }
        assertNotAnnotated(this, annotation, key)
        const annotated = annotation.extend_(this, key, descriptor)
        if (annotated) {
            recordAnnotationApplied(this, annotation, key)
        }
        return annotated
    }

    defineProperty_(key: PropertyKey, descriptor: PropertyDescriptor): boolean {
        // Assert configurable
        // TODO move - first try to define property, then if fails check configurability on devel
        if (__DEV__ && getDescriptor(this, key)?.configurable === false) {
            let error = `Property ${key.toString()} is not configurable.`
            // Mention only if caused by us to avoid confusion
            if (hasProp(this[appliedAnnotationsSymbol], key)) {
                error += `\nTo prevent accidental re-definition of a field in a subclass, `
                error += `all annotated fields of non-plain objects (classes) are not configurable.`
            }
            die(error)
        }

        try {
            startBatch()

            // Remove
            if (!this.delete_(key)) {
                // Non-configurable or prevented by interceptor
                return false
            }

            // ADD interceptor
            if (hasInterceptors(this)) {
                const change = interceptChange<IObjectWillChange>(this, {
                    object: this.proxy_ || this.target_,
                    name: key,
                    type: ADD,
                    newValue: descriptor.value
                })
                if (!change) return false
                // Ignore value if getter/setter
                if ("value" in descriptor) {
                    descriptor = {
                        ...descriptor,
                        value: (change as any).newValue
                    }
                }
            }

            // Define
            if (!reflectDefineProperty(this, key, descriptor)) {
                return false
            }

            // Notify
            this.notifyPropertyAddition_(key)
        } finally {
            endBatch()
        }
        return true
    }

    // If original descriptor becomes relevant, move this to annotation directly
    defineObservableProperty_(key: PropertyKey, value: any, enhancer: IEnhancer<any>): boolean {
        const defined = this.defineProperty_(key, {
            configurable: this.isPlainObject_,
            enumerable: true,
            get() {
                return this[$mobx].getObservablePropValue_(key)
            },
            set(value) {
                return this[$mobx].getObservablePropValue_(key, value)
            }
        })
        if (defined) {
            const observable = new ObservableValue(
                value,
                enhancer,
                `${this.name_}.${stringifyKey(key)}`,
                false
            )
            this.values_.set(key, observable)
        }
        return defined
    }

    // If original descriptor becomes relevant, move this to annotation directly
    defineComputedProperty_(key: PropertyKey, options: IComputedValueOptions<any>): boolean {
        options.name ||= `${this.name_}.${stringifyKey(key)}`
        options.context = this.proxy_ || this.target_
        const defined = this.defineProperty_(key, {
            configurable: this.isPlainObject_,
            enumerable: false,
            get() {
                return this[$mobx].getObservablePropValue_(key)
            },
            set(value) {
                this[$mobx].setObservablePropValue_(key, value)
            }
        })
        if (defined) {
            this.values_.set(key, new ComputedValue(options))
        }
        return defined
    }

    /**
     * Returns false on failure:
     * - non-configurable field (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/delete)
     * - cancelled by interceptor
     * @param key number|string|Symbol
     * @returns boolean false on failure, true on success
     */
    delete_(key: PropertyKey): boolean {
        const descriptor = getDescriptor(this.target_, key)
        if (!descriptor) {
            // No such field
            return true
        }
        if (!descriptor.configurable) {
            // Not configurable
            return false
        }
        // Intercept
        if (hasInterceptors(this)) {
            const change = interceptChange<IObjectWillChange>(this, {
                object: this.proxy_ || this.target_,
                name: key,
                type: REMOVE
            })
            // Cancelled
            if (!change) return false
        }
        // Allow re-annotating this field
        if (__DEV__) {
            delete this[appliedAnnotationsSymbol][key]
        }
        // Remove
        try {
            startBatch()
            const notify = hasListeners(this)
            const notifySpy = __DEV__ && isSpyEnabled()
            const observable = this.values_.get(key)
            // delete prop
            // shouldn't throw, we checked configurable
            delete this.target_[key]
            // value is undefined for getter/setter props
            let { value } = descriptor
            if (observable) {
                this.values_.delete(key)
                // could be computed
                if (observable instanceof ObservableValue) {
                    value = observable.get()
                    observable.set(undefined)
                }
            }
            // notify keyset listeners
            this.reportKeysChanged()
            // notify key listeners
            if (this.pendingKeys_) {
                const entry = this.pendingKeys_.get(key)
                if (entry) entry.set(false)
            }
            // delete the prop
            // TODO Reflect.delete -> move up

            // spy/listeners
            const change: IObjectDidChange | null =
                notify || notifySpy
                    ? ({
                          type: REMOVE,
                          observableKind: "object",
                          object: this.proxy_ || this.target_,
                          debugObjectName: this.name_,
                          oldValue: value,
                          name: key
                      } as const)
                    : null
            if (__DEV__ && notifySpy) spyReportStart(change!)
            if (notify) notifyListeners(this, change)
            if (__DEV__ && notifySpy) spyReportEnd()
        } finally {
            endBatch()
        }
        return true
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

    notifyPropertyAddition_(key: PropertyKey) {
        const notify = hasListeners(this)
        const notifySpy = __DEV__ && isSpyEnabled()
        if (notify || notifySpy) {
            const observable = this.values_.get(key)
            const newValue = observable
                ? observable instanceof ObservableValue
                    ? observable.value_ // observable
                    : undefined // computed
                : getDescriptor(this, key)?.value // other

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
        }

        if (this.pendingKeys_) {
            const entry = this.pendingKeys_.get(key)
            if (entry) entry.set(true)
        }
        this.reportKeysChanged()
    }

    ownKeys_(): PropertyKey[] {
        this.keysAtom_.reportObserved()
        return ownKeys(this.target_)
    }

    keys_(): PropertyKey[] {
        this.keysAtom_.reportObserved()
        return Object.keys(this.target_)
    }

    // TODO remove method (replace with one-liner)
    private reportKeysChanged() {
        this.keysAtom_.reportChanged()
    }
}

export interface IIsObservableObject {
    $mobx: ObservableObjectAdministration
}

export function asObservableObject(
    target: any,
    name: PropertyKey = "",
    defaultAnnotation: Annotation = observable
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
        defaultAnnotation
    )
    addHiddenProp(target, $mobx, adm)
    return adm
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

export function assertNotAnnotated(
    adm: ObservableObjectAdministration,
    annotation /* TODO type */,
    key: PropertyKey
) {
    if (__DEV__ && !isOverride(annotation) && hasProp(adm[appliedAnnotationsSymbol], key)) {
        const fieldName = `${adm.name_}.${key.toString()}`
        die(
            `Cannot re-annotate` +
                `\n${fieldName}: ${adm[appliedAnnotationsSymbol][key].annotationType_}` +
                `\nto` +
                `\n${fieldName}: ${annotation.annotationType_}` +
                `\nChanging annotation or it's configuration is not allowed` +
                `\nUse 'override' annotation for methods overriden by subclass`
        )
    }
}

export function recordAnnotationApplied(
    adm: ObservableObjectAdministration,
    annotation /* TODO type */,
    key: PropertyKey
) {
    if (__DEV__) {
        adm[appliedAnnotationsSymbol][key] = annotation
    }
    // Remove applied decorator annotation so we don't try to apply it again in subclass constructor
    if (annotation.isDecorator_) {
        delete adm.target_[storedAnnotationsSymbol][key]
    }
}

// TODO delete
export function assertAnnotationApplied(
    adm: ObservableObjectAdministration,
    annotation /* TODO type */,
    key: PropertyKey
) {
    // Throw on missing key, except for decorators:
    // Decorator annotations are collected from whole prototype chain.
    // When called from super() some props may not exist yet.
    // However we don't have to worry about missing prop,
    // because the decorator must have been applied to something.
    // NOTE: adm[appliedAnnotationSymbols] is available on __DEV__ only:
    // to do this check on production we would have to move this to annotation.makeObservable_
    if (__DEV__ && !annotation.isDecorator_ && !hasProp(adm[appliedAnnotationsSymbol], key)) {
        // TODO improve error
        die(1, key)
    }
}

export function assertPropertyConfigurable(adm: ObservableObjectAdministration, key: PropertyKey) {
    if (__DEV__ && getDescriptor(adm.target_, key)?.configurable) {
        let error = `Property ${key.toString()} is not configurable.`
        // Mention only if caused by us to avoid confusion
        if (hasProp(adm[appliedAnnotationsSymbol], key)) {
            error += `\nTo prevent accidental re-definition of a field in a subclass, `
            error += `all annotated fields of non-plain objects (classes) are not configurable.`
        }
        die(error)
    }
}

export function asLoudAnnotatedDescriptor(
    adm,
    annotation /* TODO type*/,
    key: PropertyKey,
    descriptor: PropertyDescriptor
) {
    if (__DEV__ && descriptor.writable === false) {
        const { configurable, enumerable, value } = descriptor
        return {
            enumerable,
            configurable,
            get() {
                return value
            },
            set(_) {
                const fieldName = `@${annotation.annotationType_} ${adm.name_}.${key.toString()}`
                die(
                    `Property ${key.toString()} is not writable.` +
                        `\n${fieldName} is not observable and therefore not writable.` +
                        `\nTo keep the field writable make the field observable (or unannotated) and wrap the value manually, eg:` +
                        `\nthis.${key.toString()} = action(() => {})` +
                        `\nSubclass can override only methods defined on prototype.`
                )
            }
        }
    }
    return descriptor
}

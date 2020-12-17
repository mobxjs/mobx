import { isAnnotation } from "../api/annotation"
import { getAnnotationFromOptions } from "../api/observable"
import {
    CreateObservableOptions,
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
    isOverride,
    defineProperty,
    inferAnnotationFromDescriptor,
    objectPrototype
} from "../internal"

// TODO is export needed?
export const appliedAnnotationsSymbol = Symbol("mobx-applied-annotations")

export const inferredAnnotationsSymbol = Symbol("mobx-inferred-annotations")

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
 * TODO better non-configurable non-writable errors on devel
 * TODO validate annotation in make_, extend_
 * TODO comment proxyTrap option
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
        public defaultAnnotation_: Annotation = observable,
        public autoBind_: boolean = false
    ) {
        this.keysAtom_ = new Atom(name_ + ".keys")
        this.isPlainObject_ = isPlainObject(this.target_)
        if (__DEV__ && !isAnnotation(this.defaultAnnotation_)) {
            die(`defaultAnnotation must be valid annotation`)
        }
        if (__DEV__ && typeof this.autoBind_ !== "boolean") {
            die(`autoBind must be boolean`)
        }
        if (__DEV__) {
            // Prepare structure for tracking which fields were already annotated
            addHiddenProp(this, appliedAnnotationsSymbol, {})
        }
    }

    getObservablePropValue_(key: PropertyKey): any {
        return this.values_.get(key)!.get()
    }

    setObservablePropValue_(key: PropertyKey, newValue): boolean {
        const observable = this.values_.get(key)
        if (observable instanceof ComputedValue) {
            observable.set(newValue)
            return true
        }

        // intercept
        if (hasInterceptors(this)) {
            const change = interceptChange<IObjectWillChange>(this, {
                type: UPDATE,
                object: this.proxy_ || this.target_,
                name: key,
                newValue
            })
            if (!change) return false
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
                          object: this.proxy_ || this.target_,
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
        return true
    }

    get_(key: PropertyKey): any {
        return this.target_[key]
    }

    set_(key: PropertyKey, value: any, proxyTrap: boolean = false): boolean {
        // faster than this.has_ - no need to subscribe for key here
        if (hasProp(this.target_, key)) {
            if (this.values_.has(key)) {
                // Can be intercepted
                return this.setObservablePropValue_(key, value)
            } else if (proxyTrap) {
                return Reflect.set(this.target_, key, value)
            } else {
                this.target_[key] = value
                return true
            }
        } else {
            return this.extend_(
                key,
                { value, enumerable: true, writable: true, configurable: true },
                this.defaultAnnotation_,
                proxyTrap
            )
        }
    }

    // Returns false for non-enumerable by design!
    has_(key: PropertyKey): boolean {
        // TODO: do this only in derivation, otherwise immediately return "key in this.target_"?
        this.pendingKeys_ ||= new Map()
        let entry = this.pendingKeys_.get(key)
        if (!entry) {
            entry = new ObservableValue(
                // It's handler for "in" operation,
                // we care about all enumerable props,
                // but we assume that prototype keys are stable
                key in this.target_,
                referenceEnhancer,
                `${this.name_}.${stringifyKey(key)}?`,
                false
            )
            this.pendingKeys_.set(key, entry)
        }
        return entry.get()
    }

    make_(key: PropertyKey, annotation: Annotation | boolean): boolean {
        if (annotation === true) {
            annotation = this.inferAnnotation_(key)
        }
        if (annotation === false) {
            return true
        }
        if (__DEV__ && !isFunction(annotation.make_)) {
            die(`Unable to make observable: Invalid annotation`)
        }
        assertAnnotable(this, annotation, key)
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
            // TODO perhaps move this check to makeObservable
            die(1, key)
        }
        return annotated
    }

    extend_(
        key: PropertyKey,
        descriptor: PropertyDescriptor,
        annotation: Annotation | boolean,
        proxyTrap: boolean = false
    ): boolean {
        if (annotation === true) {
            annotation = inferAnnotationFromDescriptor(
                descriptor,
                this.defaultAnnotation_,
                this.autoBind_
            )
        }
        if (annotation === false) {
            return this.defineProperty_(key, descriptor, proxyTrap)
        }

        if (__DEV__ && !isFunction(annotation.extend_)) {
            die(`Unable to extend observable: Invalid annotation`)
        }
        assertAnnotable(this, annotation, key)
        const annotated = annotation.extend_(this, key, descriptor, proxyTrap)
        if (annotated) {
            recordAnnotationApplied(this, annotation, key)
        }
        return annotated
    }

    inferAnnotation_(key: PropertyKey): Annotation | false {
        // Inherited is fine - annotation cannot differ in subclass
        let annotation = this[inferredAnnotationsSymbol]?.[key]
        if (annotation) return annotation

        let current = this.target_
        while (current && current !== objectPrototype) {
            const descriptor = getDescriptor(current, key)
            if (descriptor) {
                annotation = inferAnnotationFromDescriptor(
                    descriptor,
                    this.defaultAnnotation_,
                    this.autoBind_
                )
                break
            }
            current = Object.getPrototypeOf(current)
        }

        // Cache the annotation.
        // Note we can do this only because annotation and field can't change.
        if (!this.isPlainObject_ && annotation) {
            // We could also place it on furthest proto, shoudn't matter
            const closestProto = Object.getPrototypeOf(this.target_)
            if (!hasProp(closestProto, inferredAnnotationsSymbol)) {
                addHiddenProp(closestProto, inferredAnnotationsSymbol, {})
            }
            closestProto[inferredAnnotationsSymbol][key] = annotation
        }

        return annotation
    }

    defineProperty_(
        key: PropertyKey,
        descriptor: PropertyDescriptor,
        proxyTrap: boolean = false
    ): boolean {
        try {
            startBatch()

            // Delete
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
            if (proxyTrap) {
                if (!Reflect.defineProperty(this.target_, key, descriptor)) {
                    return false
                }
            } else {
                defineProperty(this.target_, key, descriptor)
            }

            // Notify
            this.notifyPropertyAddition_(key)
        } finally {
            endBatch()
        }
        return true
    }

    // If original descriptor becomes relevant, move this to annotation directly
    defineObservableProperty_(
        key: PropertyKey,
        value: any,
        enhancer: IEnhancer<any>,
        proxyTrap: boolean = false
    ): boolean {
        const defined = this.defineProperty_(
            key,
            {
                configurable: this.isPlainObject_,
                enumerable: true,
                get() {
                    return this[$mobx].getObservablePropValue_(key)
                },
                set(value) {
                    return this[$mobx].setObservablePropValue_(key, value)
                }
            },
            proxyTrap
        )
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
    defineComputedProperty_(
        key: PropertyKey,
        options: IComputedValueOptions<any>,
        proxyTrap: boolean = false
    ): boolean {
        options.name ||= `${this.name_}.${stringifyKey(key)}`
        options.context = this.proxy_ || this.target_
        const defined = this.defineProperty_(
            key,
            {
                configurable: this.isPlainObject_,
                enumerable: false,
                get() {
                    return this[$mobx].getObservablePropValue_(key)
                },
                set(value) {
                    this[$mobx].setObservablePropValue_(key, value)
                }
            },
            proxyTrap
        )
        if (defined) {
            this.values_.set(key, new ComputedValue(options))
        }
        return defined
    }

    delete_(key: PropertyKey, proxyTrap: boolean = false): boolean {
        // No such prop
        if (!hasProp(this.target_, key)) {
            return true
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

        // Delete
        try {
            startBatch()
            const notify = hasListeners(this)
            const notifySpy = __DEV__ && isSpyEnabled()
            const observable = this.values_.get(key)
            // Value needed for spy/listeners
            let value = undefined
            // Optimization: don't pull the value unless we will need it
            if (!observable && (notify || notifySpy)) {
                value = getDescriptor(this.target_, key)?.value
            }
            // delete prop (do first, may fail)
            if (proxyTrap) {
                if (!Reflect.deleteProperty(this.target_, key)) {
                    return false
                }
            } else {
                delete this.target_[key]
            }
            // Allow re-annotating this field
            if (__DEV__) {
                delete this[appliedAnnotationsSymbol][key]
            }
            // Clear observable
            if (observable) {
                this.values_.delete(key)
                // could be computed
                if (observable instanceof ObservableValue) {
                    value = observable.value_
                    observable.set(undefined)
                }
            }
            // handle keys
            this.keysAtom_.reportChanged()
            if (this.pendingKeys_) {
                const entry = this.pendingKeys_.get(key)
                if (entry) entry.set(key in this.target_) // may still exist in proto
            }
            // spy/listeners
            if (notify || notifySpy) {
                const change: IObjectDidChange = {
                    type: REMOVE,
                    observableKind: "object",
                    object: this.proxy_ || this.target_,
                    debugObjectName: this.name_,
                    oldValue: value,
                    name: key
                }
                if (__DEV__ && notifySpy) spyReportStart(change!)
                if (notify) notifyListeners(this, change)
                if (__DEV__ && notifySpy) spyReportEnd()
            }
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
                : getDescriptor(this.target_, key)?.value // other

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
        this.keysAtom_.reportChanged()
    }

    ownKeys_(): PropertyKey[] {
        this.keysAtom_.reportObserved()
        return ownKeys(this.target_)
    }

    keys_(): PropertyKey[] {
        this.keysAtom_.reportObserved()
        return Object.keys(this.target_)
    }
}

export interface IIsObservableObject {
    $mobx: ObservableObjectAdministration
}

export function asObservableObject(
    target: any,
    options?: CreateObservableOptions
): IIsObservableObject {
    if (__DEV__ && options && isObservableObject(target)) {
        die(`Options can't be provided for already observable objects.`)
    }

    if (hasProp(target, $mobx)) return target

    if (__DEV__ && !Object.isExtensible(target))
        die("Cannot make the designated object observable; it is not extensible")

    const name =
        options?.name ??
        `${isPlainObject(target) ? target.constructor.name : "ObservableObject"}@${getNextId()}`

    const adm = new ObservableObjectAdministration(
        target,
        new Map(),
        stringifyKey(name),
        getAnnotationFromOptions(options),
        options?.autoBind
    )

    addHiddenProp(target, $mobx, adm)

    return target
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

function recordAnnotationApplied(
    adm: ObservableObjectAdministration,
    annotation: Annotation,
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

function assertAnnotable(
    adm: ObservableObjectAdministration,
    annotation: Annotation,
    key: PropertyKey
) {
    /*
    // Configurable, not sealed not frozen
    if (__DEV__) {
        const configurable = getDescriptor(adm.target_, key)?.configurable
        const frozen = Object.isFrozen(adm.target_)
        const sealed = Object.isSealed(adm.target_)
        if (!configurable || frozen || sealed) {
            const fieldName = `${adm.name_}.${key.toString()}`
            const requestedAnnotationType = annotation.annotationType_
            let error = `Cannot apply '${requestedAnnotationType}' to '${fieldName}':`
            if (frozen) {
                error += `\nObject is frozen.`
            }
            if (sealed) {
                error += `\nObject is sealed.`
            }
            if (!configurable) {
                error += `\nproperty is not configurable.`
                // Mention only if caused by us to avoid confusion
                if (hasProp(adm[appliedAnnotationsSymbol], key)) {
                    error += `\nTo prevent accidental re-definition of a field by a subclass, `
                    error += `all annotated fields of non-plain objects (classes) are not configurable.`
                }
            }

            die(error)
        }
    }
    */

    // Not annotated
    if (__DEV__ && !isOverride(annotation) && hasProp(adm[appliedAnnotationsSymbol], key)) {
        const fieldName = `${adm.name_}.${key.toString()}`
        const currentAnnotationType = adm[appliedAnnotationsSymbol][key].annotationType_
        const requestedAnnotationType = annotation.annotationType_
        die(
            `Cannot apply '${requestedAnnotationType}' to '${fieldName}':` +
                `\nthe field is already annotated with '${currentAnnotationType}'.` +
                `\nRe-annotating fields is not allowed.` +
                `\nUse 'override' annotation for methods overriden by subclass.`
        )
    }
}

import {
    CreateObservableOptions,
    getAnnotationFromOptions,
    propagateChanged,
    isAnnotation,
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
    storedAnnotationsSymbol,
    ownKeys,
    isOverride,
    defineProperty,
    inferAnnotationFromDescriptor,
    getDebugName,
    getAdministration,
    objectPrototype
} from "../internal"

// closestPrototypeofTarget[inferredAnnotationsSymbol] = new Map<PropertyKes, Annotation>()
export const inferredAnnotationsSymbol = Symbol("mobx-inferred-annotations")

const descriptorCache = Object.create(null)

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
    isPlainObject_: boolean
    appliedAnnotations_?: object
    private pendingKeys_: undefined | Map<PropertyKey, ObservableValue<boolean>>

    constructor(
        public target_: any,
        public values_ = new Map<PropertyKey, ObservableValue<any> | ComputedValue<any>>(),
        public name_: string,
        // Used anytime annotation is not explicitely provided
        public defaultAnnotation_: Annotation = observable,
        // Bind automatically inferred actions?
        public autoBind_: boolean = false
    ) {
        this.keysAtom_ = new Atom(name_ + ".keys")
        // Optimization: we use this frequently
        this.isPlainObject_ = isPlainObject(this.target_)
        if (__DEV__ && !isAnnotation(this.defaultAnnotation_)) {
            die(`defaultAnnotation must be valid annotation`)
        }
        if (__DEV__ && typeof this.autoBind_ !== "boolean") {
            die(`autoBind must be boolean`)
        }
        if (__DEV__) {
            // Prepare structure for tracking which fields were already annotated
            this.appliedAnnotations_ = {}
        }
    }

    getObservablePropValue_(key: PropertyKey): any {
        return this.values_.get(key)!.get()
    }

    setObservablePropValue_(key: PropertyKey, newValue): boolean | null {
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
            if (!change) return null
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
        if (globalState.trackingDerivation && !hasProp(this.target_, key)) {
            // Key doesn't exist yet, subscribe for it in case it's added later
            this.has_(key)
        }
        return this.target_[key]
    }

    /**
     * @param {PropertyKey} key
     * @param {any} value
     * @param {Annotation|boolean} annotation true - infer from descriptor, false - copy as is
     * @param {boolean} proxyTrap whether it's called from proxy trap
     * @returns {boolean|null} true on success, false on failure (proxyTrap + non-configurable), null when cancelled by interceptor
     */
    set_(key: PropertyKey, value: any, proxyTrap: boolean = false): boolean | null {
        // Don't use .has(key) - we care about own
        if (hasProp(this.target_, key)) {
            // Existing prop
            if (this.values_.has(key)) {
                // Observable (can be intercepted)
                return this.setObservablePropValue_(key, value)
            } else if (proxyTrap) {
                // Non-observable - proxy
                return Reflect.set(this.target_, key, value)
            } else {
                // Non-observable
                this.target_[key] = value
                return true
            }
        } else {
            // New prop
            return this.extend_(
                key,
                { value, enumerable: true, writable: true, configurable: true },
                this.defaultAnnotation_,
                proxyTrap
            )
        }
    }

    // Trap for "in"
    has_(key: PropertyKey): boolean {
        if (!globalState.trackingDerivation) {
            // Skip key subscription outside derivation
            return key in this.target_
        }
        this.pendingKeys_ ||= new Map()
        let entry = this.pendingKeys_.get(key)
        if (!entry) {
            entry = new ObservableValue(
                key in this.target_,
                referenceEnhancer,
                `${this.name_}.${stringifyKey(key)}?`,
                false
            )
            this.pendingKeys_.set(key, entry)
        }
        return entry.get()
    }

    /**
     * @param {PropertyKey} key
     * @param {Annotation|boolean} annotation true - infer from object or it's prototype, false - ignore
     */
    make_(key: PropertyKey, annotation: Annotation | boolean): void {
        if (annotation === true) {
            annotation = this.inferAnnotation_(key)
        }
        if (annotation === false) {
            return
        }
        assertAnnotable(this, annotation, key)
        annotation.make_(this, key)
    }

    /**
     * @param {PropertyKey} key
     * @param {PropertyDescriptor} descriptor
     * @param {Annotation|boolean} annotation true - infer from descriptor, false - copy as is
     * @param {boolean} proxyTrap whether it's called from proxy trap
     * @returns {boolean|null} true on success, false on failure (proxyTrap + non-configurable), null when cancelled by interceptor
     */
    extend_(
        key: PropertyKey,
        descriptor: PropertyDescriptor,
        annotation: Annotation | boolean,
        proxyTrap: boolean = false
    ): boolean | null {
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
        assertAnnotable(this, annotation, key)
        const outcome = annotation.extend_(this, key, descriptor, proxyTrap)
        if (outcome) {
            recordAnnotationApplied(this, annotation, key)
        }
        return outcome
    }

    inferAnnotation_(key: PropertyKey): Annotation | false {
        // Inherited is fine - annotation cannot differ in subclass
        let annotation = this.target_[inferredAnnotationsSymbol]?.get(key)
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

        // Not found (false means ignore)
        if (annotation === undefined) {
            die(1, "true", key)
        }

        // Cache the annotation.
        // Note we can do this only because annotation and field can't change.
        if (!this.isPlainObject_) {
            // We could also place it on furthest proto, shoudn't matter
            const closestProto = Object.getPrototypeOf(this.target_)
            if (!hasProp(closestProto, inferredAnnotationsSymbol)) {
                addHiddenProp(closestProto, inferredAnnotationsSymbol, new Map())
            }
            closestProto[inferredAnnotationsSymbol].set(key, annotation)
        }

        return annotation
    }

    /**
     * @param {PropertyKey} key
     * @param {PropertyDescriptor} descriptor
     * @param {boolean} proxyTrap whether it's called from proxy trap
     * @returns {boolean|null} true on success, false on failure (proxyTrap + non-configurable), null when cancelled by interceptor
     */
    defineProperty_(
        key: PropertyKey,
        descriptor: PropertyDescriptor,
        proxyTrap: boolean = false
    ): boolean | null {
        try {
            startBatch()

            // Delete
            const deleteOutcome = this.delete_(key)
            if (!deleteOutcome) {
                // Failure or intercepted
                return deleteOutcome
            }

            // ADD interceptor
            if (hasInterceptors(this)) {
                const change = interceptChange<IObjectWillChange>(this, {
                    object: this.proxy_ || this.target_,
                    name: key,
                    type: ADD,
                    newValue: descriptor.value
                })
                if (!change) return null
                const { newValue } = change as any
                if (descriptor.value !== newValue) {
                    descriptor = {
                        ...descriptor,
                        value: newValue
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
            this.notifyPropertyAddition_(key, descriptor.value)
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
    ): boolean | null {
        try {
            startBatch()

            // Delete
            const deleteOutcome = this.delete_(key)
            if (!deleteOutcome) {
                // Failure or intercepted
                return deleteOutcome
            }

            // ADD interceptor
            if (hasInterceptors(this)) {
                const change = interceptChange<IObjectWillChange>(this, {
                    object: this.proxy_ || this.target_,
                    name: key,
                    type: ADD,
                    newValue: value
                })
                if (!change) return null
                value = (change as any).newValue
            }

            const cachedDescriptor = getCachedObservablePropDescriptor(key)
            const descriptor = {
                configurable: globalState.safeDescriptors ? this.isPlainObject_ : true,
                enumerable: true,
                get: cachedDescriptor.get,
                set: cachedDescriptor.set
            }

            // Define
            if (proxyTrap) {
                if (!Reflect.defineProperty(this.target_, key, descriptor)) {
                    return false
                }
            } else {
                defineProperty(this.target_, key, descriptor)
            }

            const observable = new ObservableValue(
                value,
                enhancer,
                `${this.name_}.${stringifyKey(key)}`,
                false
            )

            this.values_.set(key, observable)

            // Notify (value possibly changed by ObservableValue)
            this.notifyPropertyAddition_(key, observable.value_)
        } finally {
            endBatch()
        }
        return true
    }

    // If original descriptor becomes relevant, move this to annotation directly
    defineComputedProperty_(
        key: PropertyKey,
        options: IComputedValueOptions<any>,
        proxyTrap: boolean = false
    ): boolean | null {
        try {
            startBatch()

            // Delete
            const deleteOutcome = this.delete_(key)
            if (!deleteOutcome) {
                // Failure or intercepted
                return deleteOutcome
            }

            // ADD interceptor
            if (hasInterceptors(this)) {
                const change = interceptChange<IObjectWillChange>(this, {
                    object: this.proxy_ || this.target_,
                    name: key,
                    type: ADD,
                    newValue: undefined
                })
                if (!change) return null
            }
            options.name ||= `${this.name_}.${stringifyKey(key)}`
            options.context = this.proxy_ || this.target_
            const cachedDescriptor = getCachedObservablePropDescriptor(key)
            const descriptor = {
                configurable: globalState.safeDescriptors ? this.isPlainObject_ : true,
                enumerable: false,
                get: cachedDescriptor.get,
                set: cachedDescriptor.set
            }

            // Define
            if (proxyTrap) {
                if (!Reflect.defineProperty(this.target_, key, descriptor)) {
                    return false
                }
            } else {
                defineProperty(this.target_, key, descriptor)
            }

            this.values_.set(key, new ComputedValue(options))

            // Notify
            this.notifyPropertyAddition_(key, undefined)
        } finally {
            endBatch()
        }
        return true
    }

    /**
     * @param {PropertyKey} key
     * @param {PropertyDescriptor} descriptor
     * @param {boolean} proxyTrap whether it's called from proxy trap
     * @returns {boolean|null} true on success, false on failure (proxyTrap + non-configurable), null when cancelled by interceptor
     */
    delete_(key: PropertyKey, proxyTrap: boolean = false): boolean | null {
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
            if (!change) return null
        }

        // Delete
        try {
            startBatch()
            const notify = hasListeners(this)
            const notifySpy = __DEV__ && isSpyEnabled()
            const observable = this.values_.get(key)
            // Value needed for spies/listeners
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
                delete this.appliedAnnotations_![key]
            }
            // Clear observable
            if (observable) {
                this.values_.delete(key)
                // for computed, value is undefined
                if (observable instanceof ObservableValue) {
                    value = observable.value_
                }
                // Notify: autorun(() => obj[key]), see #1796
                propagateChanged(observable)
            }
            // Notify "keys/entries/values" observers
            this.keysAtom_.reportChanged()

            // Notify "has" observers
            // "in" as it may still exist in proto
            this.pendingKeys_?.get(key)?.set(key in this.target_)

            // Notify spies/listeners
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

    notifyPropertyAddition_(key: PropertyKey, value: any) {
        const notify = hasListeners(this)
        const notifySpy = __DEV__ && isSpyEnabled()
        if (notify || notifySpy) {
            const change: IObjectDidChange | null =
                notify || notifySpy
                    ? ({
                          type: ADD,
                          observableKind: "object",
                          debugObjectName: this.name_,
                          object: this.proxy_ || this.target_,
                          name: key,
                          newValue: value
                      } as const)
                    : null

            if (__DEV__ && notifySpy) spyReportStart(change!)
            if (notify) notifyListeners(this, change)
            if (__DEV__ && notifySpy) spyReportEnd()
        }

        this.pendingKeys_?.get(key)?.set(true)

        // Notify "keys/entries/values" observers
        this.keysAtom_.reportChanged()
    }

    ownKeys_(): PropertyKey[] {
        this.keysAtom_.reportObserved()
        return ownKeys(this.target_)
    }

    keys_(): PropertyKey[] {
        // Returns enumerable && own, but unfortunately keysAtom will report on ANY key change.
        // There is no way to distinguish between Object.keys(object) and Reflect.ownKeys(object) - both are handled by ownKeys trap.
        // We can either over-report in Object.keys(object) or under-report in Reflect.ownKeys(object)
        // We choose to over-report in Object.keys(object), because:
        // - typically it's used with simple data objects
        // - when symbolic/non-enumerable keys are relevant Reflect.ownKeys works as expected
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

    if (hasProp(target, $mobx)) {
        if (__DEV__ && !(getAdministration(target) instanceof ObservableObjectAdministration)) {
            die(
                `Cannot convert '${getDebugName(target)}' into observable object:` +
                    `\nThe target is already observable of different type.` +
                    `\nExtending builtins is not supported.`
            )
        }
        return target
    }

    if (__DEV__ && !Object.isExtensible(target))
        die("Cannot make the designated object observable; it is not extensible")

    const name =
        options?.name ??
        `${isPlainObject(target) ? "ObservableObject" : target.constructor.name}@${getNextId()}`

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

function getCachedObservablePropDescriptor(key) {
    return (
        descriptorCache[key] ||
        (descriptorCache[key] = {
            get() {
                return this[$mobx].getObservablePropValue_(key)
            },
            set(value) {
                return this[$mobx].setObservablePropValue_(key, value)
            }
        })
    )
}

export function isObservableObject(thing: any): boolean {
    if (isObject(thing)) {
        return isObservableObjectAdministration((thing as any)[$mobx])
    }
    return false
}

export function recordAnnotationApplied(
    adm: ObservableObjectAdministration,
    annotation: Annotation,
    key: PropertyKey
) {
    if (__DEV__) {
        adm.appliedAnnotations_![key] = annotation
    }
    // Remove applied decorator annotation so we don't try to apply it again in subclass constructor
    delete adm.target_[storedAnnotationsSymbol]?.[key]
}

function assertAnnotable(
    adm: ObservableObjectAdministration,
    annotation: Annotation,
    key: PropertyKey
) {
    // Valid annotation
    if (__DEV__ && !isAnnotation(annotation)) {
        die(`Cannot annotate '${adm.name_}.${key.toString()}': Invalid annotation.`)
    }

    /*
    // Configurable, not sealed, not frozen
    // Possibly not needed, just a little better error then the one thrown by engine.
    // Cases where this would be useful the most (subclass field initializer) are not interceptable by this.
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
                if (hasProp(adm.appliedAnnotations!, key)) {
                    error += `\nTo prevent accidental re-definition of a field by a subclass, `
                    error += `all annotated fields of non-plain objects (classes) are not configurable.`
                }
            }
            die(error)
        }
    }
    */

    // Not annotated
    if (__DEV__ && !isOverride(annotation) && hasProp(adm.appliedAnnotations_!, key)) {
        const fieldName = `${adm.name_}.${key.toString()}`
        const currentAnnotationType = adm.appliedAnnotations_![key].annotationType_
        const requestedAnnotationType = annotation.annotationType_
        die(
            `Cannot apply '${requestedAnnotationType}' to '${fieldName}':` +
                `\nThe field is already annotated with '${currentAnnotationType}'.` +
                `\nRe-annotating fields is not allowed.` +
                `\nUse 'override' annotation for methods overriden by subclass.`
        )
    }
}

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
    spyReportEnd,
    spyReportStart,
    startBatch,
    stringifyKey,
    globalState,
    ADD,
    UPDATE,
    die,
    hasProp,
    getDescriptor,
    ownKeys,
    isOverride,
    defineProperty,
    autoAnnotation,
    getAdministration,
    getDebugName,
    checkIfStateModificationsAreAllowed,
    checkIfStateReadsAreAllowed,
    assign,
    compareDefault
} from "../internal"

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
    implements IInterceptable<IObjectWillChange>, IListenable
{
    keysAtom_: IAtom
    changeListeners_
    interceptors_
    proxy_: any
    isPlainObject_: boolean
    appliedAnnotations_?: object
    private pendingKeys_: undefined | Map<PropertyKey, ObservableValue<boolean>>
    lazyComputedKeys_: undefined | Map<PropertyKey, () => ComputedValue<any>>
    // The `@observable accessor` fields of the target's class, shared by all its instances
    accessorFields_: undefined | Map<PropertyKey, ObservableAccessorField>
    // How many of them the constructor of the target has initialized so far
    accessorFieldsInitialized_ = 0

    constructor(
        public target_: any,
        public values_ = new Map<PropertyKey, ObservableValue<any> | ComputedValue<any>>(),
        public name_: string,
        // Used anytime annotation is not explicitely provided
        public defaultAnnotation_: Annotation = autoAnnotation
    ) {
        this.keysAtom_ = new Atom(__DEV__ ? `${this.name_}.keys` : "ObservableObject.keys")
        // Optimization: we use this frequently
        this.isPlainObject_ = isPlainObject(this.target_)
        if (__DEV__ && !isAnnotation(this.defaultAnnotation_)) {
            die(`defaultAnnotation must be valid annotation`)
        }
        if (__DEV__) {
            // Prepare structure for tracking which fields were already annotated
            this.appliedAnnotations_ = {}
        }
    }

    getObservablePropValue_(key: PropertyKey): any {
        // Hot path: single map lookup. Lazy entries (rare) take the materialise branch.
        const observable =
            this.values_.get(key) ??
            this.materializeLazyComputed_(key) ??
            this.materializeLazyObservable_(key)
        return observable!.get()
    }

    materializeLazyComputed_(key: PropertyKey): ComputedValue<any> | undefined {
        const factory = this.lazyComputedKeys_?.get(key)
        if (!factory) {
            return undefined
        }
        this.lazyComputedKeys_!.delete(key)
        if (this.lazyComputedKeys_!.size === 0) {
            this.lazyComputedKeys_ = undefined
        }
        const computed = factory()
        this.values_.set(key, computed)
        return computed
    }

    materializeLazyObservable_(key: PropertyKey): ObservableValue<any> | undefined {
        const field = this.accessorFields_?.get(key)
        return field && this.isAccessorFieldInitialized_(field)
            ? this.materializeAccessorField_(key, field)
            : undefined
    }

    isAccessorFieldInitialized_(field: ObservableAccessorField): boolean {
        return field.index_ < this.accessorFieldsInitialized_
    }

    /** Moves the value of an `@observable accessor` field from its slot into an ObservableValue */
    materializeAccessorField_(
        key: PropertyKey,
        field: ObservableAccessorField
    ): ObservableValue<any> {
        const target = this.target_
        const value = field.get_.call(target)
        field.set_.call(target, undefined)
        return this.createAccessorObservable_(
            key,
            field,
            value instanceof UnenhancedValue ? value.value_ : value
        )
    }

    createAccessorObservable_(
        key: PropertyKey,
        field: ObservableAccessorField,
        value: any
    ): ObservableValue<any> {
        const observable = new ObservableValue(
            value,
            field.enhancer_,
            this.getAccessorFieldName_(field),
            false
        )
        this.values_.set(key, observable)
        return observable
    }

    getAccessorFieldName_(field: ObservableAccessorField): string {
        return __DEV__ ? `${this.name_}.${field.name_}` : field.name_
    }

    /** Reads an `@observable accessor` field that has no ObservableValue, outside of derivations */
    getAccessorFieldValue_(field: ObservableAccessorField): any {
        if (__DEV__ && !globalState.allowStateReads && globalState.observableRequiresReaction) {
            checkIfStateReadsAreAllowed({ name_: this.getAccessorFieldName_(field) } as any)
        }
        const target = this.target_
        let value = field.get_.call(target)
        if (value instanceof UnenhancedValue) {
            value = field.enhancer_(value.value_, undefined, this.getAccessorFieldName_(field))
            field.set_.call(target, value)
        }
        return value
    }

    setObservablePropValue_(
        key: PropertyKey,
        newValue,
        // Given by `@observable accessor`, whose fields get an ObservableValue once they need one
        field?: ObservableAccessorField
    ): boolean | null {
        let observable = this.values_.get(key) ?? this.materializeLazyComputed_(key)
        if (!observable) {
            if (!field) {
                observable = this.materializeLazyObservable_(key)
            } else if (!this.isAccessorFieldInitialized_(field)) {
                // Written before the constructor initialized the field, like a superclass
                // constructor that assigns the fields of its subclasses. The accessor's slot
                // does not exist yet.
                this.accessorFields_ ??= getAccessorFields(this.target_)
                observable = this.createAccessorObservable_(key, field, newValue)
            }
        }
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
            if (!change) {
                return null
            }
            newValue = (change as any).newValue
        }
        let oldValue
        if (observable) {
            oldValue = observable.value_
            newValue = (observable as any).prepareNewValue_(newValue)
        } else {
            // No ObservableValue, so no observers: the value only goes into the accessor's slot
            if (
                __DEV__ &&
                !globalState.allowStateChanges &&
                globalState.enforceActions === "always"
            ) {
                checkIfStateModificationsAreAllowed({
                    name_: this.getAccessorFieldName_(field!)
                } as any)
            }
            oldValue = field!.get_.call(this.target_)
            if (oldValue instanceof UnenhancedValue) {
                oldValue = oldValue.value_
            }
            newValue = field!.enhancer_(newValue, oldValue, this.getAccessorFieldName_(field!))
            if (compareDefault(oldValue, newValue)) {
                newValue = globalState.UNCHANGED
            }
        }

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
                          oldValue,
                          name: key,
                          newValue
                      }
                    : null

            if (__DEV__ && notifySpy) {
                spyReportStart(change!)
            }
            if (observable) {
                observable.setNewValue_(newValue)
            } else {
                field!.set_.call(this.target_, newValue)
            }
            if (notify) {
                notifyListeners(this, change)
            }
            if (__DEV__ && notifySpy) {
                spyReportEnd()
            }
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
     * @param {Annotation|boolean} annotation true - use default annotation, false - copy as is
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
                __DEV__ ? `${this.name_}.${stringifyKey(key)}?` : "ObservableObject.key?",
                false
            )
            this.pendingKeys_.set(key, entry)
            entry.onBUOL = new Set([() => this.pendingKeys_?.delete(key)])
        }
        return entry.get()
    }

    /**
     * @param {PropertyKey} key
     * @param {PropertyDescriptor} descriptor
     * @param {Annotation|boolean} annotation true - use default annotation, false - copy as is
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
            annotation = this.defaultAnnotation_
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
        checkIfStateModificationsAreAllowed(this.keysAtom_)
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
                if (!change) {
                    return null
                }
                const { newValue } = change as any
                if (descriptor.value !== newValue) {
                    descriptor = assign({}, descriptor, {
                        value: newValue
                    })
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
        checkIfStateModificationsAreAllowed(this.keysAtom_)
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
                if (!change) {
                    return null
                }
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
                __DEV__ ? `${this.name_}.${key.toString()}` : "ObservableObject.key",
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
        checkIfStateModificationsAreAllowed(this.keysAtom_)
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
                if (!change) {
                    return null
                }
            }
            options.name ||= __DEV__ ? `${this.name_}.${key.toString()}` : "ObservableObject.key"
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
        checkIfStateModificationsAreAllowed(this.keysAtom_)
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
            if (!change) {
                return null
            }
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
                if (__DEV__ && notifySpy) {
                    spyReportStart(change!)
                }
                if (notify) {
                    notifyListeners(this, change)
                }
                if (__DEV__ && notifySpy) {
                    spyReportEnd()
                }
            }
        } finally {
            endBatch()
        }
        return true
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

            if (__DEV__ && notifySpy) {
                spyReportStart(change!)
            }
            if (notify) {
                notifyListeners(this, change)
            }
            if (__DEV__ && notifySpy) {
                spyReportEnd()
            }
        }

        this.pendingKeys_?.get(key)?.set(true)

        // Notify "keys/entries/values" observers
        this.keysAtom_.reportChanged()
    }

    ownKeys_(): Array<string | symbol> {
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
    [$mobx]: ObservableObjectAdministration
}

/**
 * An `@observable accessor` field, shared by all instances of the class that declares it.
 *
 * Such a field has no ObservableValue until something needs one: a read inside a derivation,
 * or an API that works on it, like `getAtom`, `observe(object, key)`, `intercept(object, key)`
 * and `onBecomeObserved`. Until then the value lives in the accessor's own backing slot, so a
 * field that nothing observes costs no allocation, however often it is read or written.
 */
export type ObservableAccessorField = {
    enhancer_: IEnhancer<any>
    /** Reads the accessor's backing slot */
    get_: (this: any) => any
    /** Writes the accessor's backing slot */
    set_: (this: any, value: any) => void
    /** The field name in development, the debug name of its ObservableValue in production */
    name_: string
    /**
     * Position among the `@observable accessor` fields of an instance, which are initialized in
     * a fixed order. `Infinity` until the first instance initializes the field.
     */
    index_: number
}

/**
 * An initial value the enhancer has not seen yet, so that a field nobody reads does not pay for
 * the conversion
 */
export class UnenhancedValue {
    constructor(public value_: any) {}
}

const accessorFieldsByPrototype = new WeakMap<object, Map<PropertyKey, ObservableAccessorField>>()

export function getAccessorFields(target: object): Map<PropertyKey, ObservableAccessorField> {
    const proto = Object.getPrototypeOf(target)
    let fields = accessorFieldsByPrototype.get(proto)
    if (!fields) {
        accessorFieldsByPrototype.set(proto, (fields = new Map()))
    }
    return fields
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

    if (__DEV__ && !Object.isExtensible(target)) {
        die("Cannot make the designated object observable; it is not extensible")
    }

    const name =
        options?.name ??
        (__DEV__
            ? `${
                  isPlainObject(target) ? "ObservableObject" : target.constructor.name
              }@${getNextId()}`
            : "ObservableObject")

    const adm = new ObservableObjectAdministration(
        target,
        new Map(),
        String(name),
        getAnnotationFromOptions(options)
    )

    addHiddenProp(target, $mobx, adm)

    return target
}

export const isObservableObjectAdministration = createInstanceofPredicate(
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
}

export function assertAnnotable(
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
                `\nUse 'override' annotation for methods overridden by subclass.`
        )
    }
}

import {
    asObservableObject,
    addHiddenProp,
    action,
    autoAction,
    isAction,
    computed,
    observable,
    AnnotationsMap,
    Annotation,
    getEnhancerFromAnnotation,
    endBatch,
    startBatch,
    CreateObservableOptions,
    ObservableObjectAdministration,
    collectStoredAnnotations,
    isObservableProp,
    getDescriptor,
    isPlainObject,
    isObservableObject,
    isFunction,
    die,
    ACTION,
    ACTION_BOUND,
    AUTOACTION,
    AUTOACTION_BOUND,
    COMPUTED,
    COMPUTED_STRUCT,
    OBSERVABLE,
    OBSERVABLE_REF,
    OBSERVABLE_SHALLOW,
    OBSERVABLE_STRUCT,
    getOwnPropertyDescriptors,
    defineProperty,
    ownKeys,
    objectPrototype,
    hasProp,
    FLOW,
    flow,
    isGenerator,
    isFlow,
    appliedAnnotationsSymbol,
    storedAnnotationsSymbol
} from "../internal"

const cachedAnnotationsSymbol = Symbol("mobx-cached-annotations")

/*
// Alterantive version allowing writable actions, without the need for re-annotating, but consumes more memory
function addAction(
    target: Object,
    key: PropertyKey,
    { value, writable, configurable, enumerable }: PropertyDescriptor,
    name,
    asAutoAction: boolean,
    bindTo?: Object
) {
    name ||= key
    let storedValue
    defineProperty(target, key, {
        configurable,
        enumerable,
        get() {
            return storedValue
        },
        set: writable
            ? function (v) {
                  if (typeof v === "function" && !isAction(v)) {
                      v = bindTo ? v.bind(bindTo) : v
                      v = asAutoAction ? autoAction(name, v) : action(name, v)
                  }
                  storedValue = v
              }
            : undefined
    })
    target[key] = value
}
*/

function addAction(
    target: Object,
    key: PropertyKey,
    { value, writable, configurable }: PropertyDescriptor,
    name,
    asAutoAction: boolean,
    bindTo?: Object
) {
    name ||= key
    value = bindTo ? value.bind(bindTo) : value
    value = asAutoAction ? autoAction(name, value) : action(name, value)
    // If non-writable make it sound on devel
    if (__DEV__ && !writable) {
        defineProperty(target, key, {
            configurable,
            // https://github.com/mobxjs/mobx/pull/2641#issuecomment-737292058
            enumerable: false,
            get() {
                return value
            },
            set(_) {
                die(
                    `Property ${key.toString()} is not writable.` +
                        `\nAction fields created by 'makeObservable' are not writable.` +
                        `\nOnly actions defined on prototype can be overriden by subclass.` +
                        `\nYou can remove the annotation and wrap the function manually:` +
                        `\nthis.${key.toString()} = action(() => {})`
                )
            }
        })
    } else {
        defineProperty(target, key, {
            value,
            configurable,
            enumerable: false,
            writable
        })
    }
}

function addFlow(
    target: Object,
    key: PropertyKey,
    { value, writable, configurable, enumerable }: PropertyDescriptor
) {
    value = flow(value)
    // If non-writable make it sound on devel
    if (__DEV__ && !writable) {
        defineProperty(target, key, {
            configurable,
            enumerable,
            get() {
                return value
            },
            set(_) {
                die(
                    `Property ${key.toString()} is not writable.` +
                        `\nFlow fields created by 'makeObservable' are not writable.` +
                        `\nOnly flows defined on prototype can be overriden by subclass.` +
                        `\nYou can remove the annotation and wrap the function manually:` +
                        `\nthis.${key.toString()} = flow(function*() {})`
                )
            }
        })
    } else {
        defineProperty(target, key, {
            value,
            configurable,
            enumerable,
            writable
        })
    }
}

/**
 * Infers the best fitting annotation from property descriptor
 * - getter(+setter) -> computed
 * - setter w/o getter -> false
 * - generator -> flow
 * - function -> action
 * - other -> observable.deep
 */
function inferAnnotation(
    desc: PropertyDescriptor,
    defaultAnnotation: Annotation | undefined,
    autoBind: boolean
): Annotation | boolean {
    if (desc.get) return computed
    if (desc.set) return false // ignore setter w/o getter
    // if already wrapped in action, don't do that another time, but assume it is already set up properly
    if (isFunction(desc.value))
        return isGenerator(desc.value)
            ? flow
            : isAction(desc.value)
            ? false
            : autoBind
            ? autoAction.bound
            : autoAction
    // if (!desc.configurable || !desc.writable) return false
    return defaultAnnotation ?? observable.deep
}

export function makeProperty(
    adm: ObservableObjectAdministration,
    owner: Object,
    key: PropertyKey,
    descriptor: PropertyDescriptor,
    annotation: Annotation | boolean,
    forceCopy: boolean, // extend observable will copy even unannotated properties
    autoBind: boolean
): void {
    const { target_: target } = adm
    const defaultAnnotation: Annotation | undefined = observable // ideally grap this from adm's defaultEnahncer instead!
    const originAnnotation = annotation
    if (annotation === true) {
        annotation = inferAnnotation(descriptor, defaultAnnotation, autoBind)
    }
    if (annotation === false) {
        if (forceCopy) {
            defineProperty(target, key, descriptor)
        }
        return
    }
    if (!annotation || annotation === true || !annotation.annotationType_) {
        return die(2, key)
    }

    const type = annotation.annotationType_

    switch (type) {
        case AUTOACTION:
        case ACTION: {
            const fn = owner[key]
            if (!isFunction(fn)) die(3, key, type)
            if (owner !== target && !forceCopy) {
                if (!isAction(owner[key]))
                    addAction(owner, key, descriptor, annotation.arg_, type === AUTOACTION)
            } else {
                addAction(target, key, descriptor, annotation.arg_, type === AUTOACTION)
            }
            break
        }
        case AUTOACTION_BOUND:
        case ACTION_BOUND: {
            const fn = owner[key]
            if (!isFunction(fn)) die(3, key, type)
            addAction(
                target,
                key,
                descriptor,
                annotation.arg_,
                type === AUTOACTION_BOUND,
                adm.proxy_ || target
            )
            break
        }
        case FLOW: {
            const fn = owner[key]
            if (!isFunction(fn)) die(3, key, type)
            if (owner !== target && !forceCopy) {
                if (!isFlow(owner[key])) addFlow(owner, key, descriptor)
            } else {
                addFlow(owner, key, descriptor)
            }
            break
        }
        case COMPUTED:
        case COMPUTED_STRUCT: {
            if (!descriptor.get) die(4, key)
            adm.addComputedProp_(target, key, {
                get: descriptor.get,
                set: descriptor.set,
                compareStructural: annotation.annotationType_ === COMPUTED_STRUCT,
                ...annotation.arg_
            })
            break
        }
        case OBSERVABLE:
        case OBSERVABLE_REF:
        case OBSERVABLE_SHALLOW:
        case OBSERVABLE_STRUCT: {
            if (__DEV__ && isObservableProp(target, key as any))
                die(
                    `Cannot decorate '${key.toString()}': the property is already decorated as observable.`
                )
            if (__DEV__ && !("value" in descriptor))
                die(
                    `Cannot decorate '${key.toString()}': observable cannot be used on setter / getter properties.`
                )
            // if the originAnnotation was true, prefer the adm's default enhancer over the inferred one
            const enhancer =
                originAnnotation === true
                    ? adm.defaultEnhancer_
                    : getEnhancerFromAnnotation(annotation)

            adm.addObservableProp_(key, descriptor, enhancer)
            break
        }
        default:
            if (__DEV__)
                die(
                    `invalid decorator '${
                        annotation.annotationType_ ?? annotation
                    }' for '${key.toString()}'`
                )
    }
}

// Hack based on https://github.com/Microsoft/TypeScript/issues/14829#issuecomment-322267089
// We need this, because otherwise, AdditionalKeys is going to be inferred to be any
// set of superfluous keys. But, we rather want to get a compile error unless AdditionalKeys is
// _explicity_ passed as generic argument
// Fixes: https://github.com/mobxjs/mobx/issues/2325#issuecomment-691070022
type NoInfer<T> = [T][T extends any ? 0 : never]

export function makeObservable<T, AdditionalKeys extends PropertyKey = never>(
    target: T,
    annotations?: AnnotationsMap<T, NoInfer<AdditionalKeys>>,
    options?: CreateObservableOptions
): T {
    const autoBind = !!options?.autoBind
    const adm = asObservableObject(
        target,
        options?.name,
        getEnhancerFromAnnotation(options?.defaultDecorator)
    )
    startBatch()
    try {
        // Prepare structure for tracking which fields were already annotated
        if (__DEV__ && !target[appliedAnnotationsSymbol]) {
            addHiddenProp(target, appliedAnnotationsSymbol, {})
        }

        // Default to decorators
        annotations ??= collectStoredAnnotations(target)

        // Annotate
        ownKeys(annotations).forEach(key => annotate(adm, key, annotations![key], autoBind))
    } finally {
        endBatch()
    }
    return target
}

function annotate(adm, key, annotation, autoBind) {
    const { target_: target } = adm
    let annotationApplied = false
    // Cannot re-annotate
    if (
        __DEV__ &&
        annotation.annotationType_ !== "override" &&
        hasProp(target[appliedAnnotationsSymbol], key)
    ) {
        die(
            38,
            key,
            target[appliedAnnotationsSymbol][key].annotationType_,
            annotation.annotationType_
        )
    }

    // override must override something
    if (
        __DEV__ &&
        annotation.annotationType_ === "override" &&
        !hasProp(target[appliedAnnotationsSymbol], key)
    ) {
        die(
            `Property '${key.toString()}' is annotated with 'override', but no such annotated member was found on prototype.`
        )
    }

    // Ignore override
    if (annotation.annotationType_ === "override") {
        return
    }

    // Traverse proto chain and apply annotation to anything that has a descriptor for this key
    let owner = target
    while (owner && owner !== objectPrototype) {
        const desc = getDescriptor(owner, key)
        if (desc) {
            // Cannot override computed
            if (
                __DEV__ &&
                annotationApplied &&
                (annotation.annotationType_ === COMPUTED ||
                    annotation.annotationType_ === COMPUTED_STRUCT)
            ) {
                die(
                    `Cannot override computed '${key.toString()}' - overriding computed is not supported.` +
                        `\nPlease create a second private non-computed overridable getter and expose it via original computed.` +
                        `\nSee an example in the documentation: TODO link`
                )
            }

            // If bound action, use closest definition in proto chain and stop
            if (
                annotationApplied &&
                (annotation.annotationType_ === ACTION_BOUND ||
                    annotation.annotationType_ === AUTOACTION_BOUND)
            ) {
                break
            }

            if (__DEV__) {
                // Make everything annotated non-configurable,
                // so that user can't redefine fields in subclass:
                // observable = 5;
                // action = () => {};
                desc.configurable = false
                // Make action/flow non-writable,
                // so that user can't rewrite action/flow in subclass constructor:
                // this.action = function noLongerAction() {};
                if (
                    annotation.annotationType_ === ACTION ||
                    annotation.annotationType_ === ACTION_BOUND ||
                    annotation.annotationType_ === AUTOACTION ||
                    annotation.annotationType_ === AUTOACTION_BOUND ||
                    annotation.annotationType_ === FLOW
                ) {
                    desc.writable = false
                }
            }

            makeProperty(adm, owner, key, desc, annotation, false, autoBind)
            annotationApplied = true
        }
        owner = Object.getPrototypeOf(owner)
    }
    // Remove applied annotation so we don't try to apply it again in subclass constructor
    if (annotation.isDecorator_ && annotationApplied) {
        delete target[storedAnnotationsSymbol][key]
    }

    // Throw on missing key, except for decorators:
    // Decorator annotations are collected from whole prototype chain.
    // When called from super() some props may not exist yet.
    // However we don't have to worry about missing prop,
    // because the decorator must have been applied to something.
    if (!annotation.isDecorator_ && !annotationApplied) {
        die(1, key)
    }

    // Record annotation applied
    if (__DEV__ && annotationApplied) {
        target[appliedAnnotationsSymbol][key] = annotation
    }
}

export function makeAutoObservable<T extends Object, AdditionalKeys extends PropertyKey = never>(
    target: T,
    overrides?: AnnotationsMap<T, NoInfer<AdditionalKeys>>,
    options?: CreateObservableOptions
): T {
    const proto = Object.getPrototypeOf(target)
    const isPlain = proto == null || proto === objectPrototype
    if (__DEV__) {
        if (!isPlain && !isPlainObject(proto))
            die(`'makeAutoObservable' can only be used for classes that don't have a superclass`)
        if (isObservableObject(target))
            die(`makeAutoObservable can only be used on objects not already made observable`)
    }
    let annotations: AnnotationsMap<any, any>
    if (!isPlain && hasProp(proto, cachedAnnotationsSymbol)) {
        // shortcut, reuse inferred annotations for this type from the previous time
        annotations = proto[cachedAnnotationsSymbol] as any
    } else {
        annotations = { ...overrides }
        inferAnnotationsFromObject(target, annotations, options)
        if (!isPlain) {
            inferAnnotationsFromProto(proto, annotations, options)
            addHiddenProp(proto, cachedAnnotationsSymbol, annotations)
        }
    }
    makeObservable(target, annotations as any, options)
    return target
}

function inferAnnotationsFromObject(
    target,
    collector: AnnotationsMap<any, any>,
    options: CreateObservableOptions | undefined
) {
    const autoBind = !!options?.autoBind
    const defaultAnnotation: Annotation =
        options?.deep === undefined
            ? options?.defaultDecorator ?? observable.deep
            : options?.deep
            ? observable.deep
            : observable.ref
    Object.entries(getOwnPropertyDescriptors(target)).forEach(([key, descriptor]) => {
        if (key in collector || key === "constructor") return
        collector[key] = inferAnnotation(descriptor, defaultAnnotation, autoBind)
    })
}

function inferAnnotationsFromProto(
    proto: any,
    collector: AnnotationsMap<any, any>,
    options?: CreateObservableOptions
) {
    Object.entries(getOwnPropertyDescriptors(proto)).forEach(([key, prop]) => {
        if (key in collector || key === "constructor") return
        if (prop.get) {
            collector[key as any] = computed
        } else if (isFunction(prop.value)) {
            collector[key as any] = isGenerator(prop.value)
                ? flow
                : options?.autoBind
                ? autoAction.bound
                : autoAction
        }
    })
}

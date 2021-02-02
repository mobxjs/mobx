import {
    ObservableObjectAdministration,
    createAction,
    isAction,
    defineProperty,
    getDescriptor,
    objectPrototype,
    die,
    isFunction,
    Annotation,
    recordAnnotationApplied,
    globalState,
    storedAnnotationsSymbol
} from "../internal"

export function createActionAnnotation(name: string, options?: object): Annotation {
    return {
        annotationType_: name,
        options_: options,
        make_,
        extend_
    }
}

function make_(adm: ObservableObjectAdministration, key: PropertyKey): void {
    let annotated = false
    let source = adm.target_
    let bound = this.options_?.bound ?? false
    while (source && source !== objectPrototype) {
        const descriptor = getDescriptor(source, key)
        if (descriptor) {
            // Instance or bound
            // Keep first because the operation can be intercepted
            // and we don't want to end up with partially annotated proto chain
            if (source === adm.target_ || bound) {
                const actionDescriptor = createActionDescriptor(adm, this, key, descriptor)
                const definePropertyOutcome = adm.defineProperty_(key, actionDescriptor)
                if (!definePropertyOutcome) {
                    // Intercepted
                    return
                }
                annotated = true
                // Don't annotate protos if bound
                if (bound) {
                    break
                }
            }
            // Prototype
            if (source !== adm.target_) {
                if (isAction(descriptor.value)) {
                    // A prototype could have been annotated already by other constructor,
                    // rest of the proto chain must be annotated already
                    annotated = true
                    break
                }
                const actionDescriptor = createActionDescriptor(adm, this, key, descriptor, false)
                defineProperty(source, key, actionDescriptor)
                annotated = true
            }
        }
        source = Object.getPrototypeOf(source)
    }
    if (annotated) {
        recordAnnotationApplied(adm, this, key)
    } else if (!adm.target_[storedAnnotationsSymbol]?.[key]) {
        // Throw on missing key, except for decorators:
        // Decorator annotations are collected from whole prototype chain.
        // When called from super() some props may not exist yet.
        // However we don't have to worry about missing prop,
        // because the decorator must have been applied to something.
        die(1, this.annotationType_, `${adm.name_}.${key.toString()}`)
    }
}

function extend_(
    adm: ObservableObjectAdministration,
    key: PropertyKey,
    descriptor: PropertyDescriptor,
    proxyTrap: boolean
): boolean | null {
    const actionDescriptor = createActionDescriptor(adm, this, key, descriptor)
    return adm.defineProperty_(key, actionDescriptor, proxyTrap)
}

function assertActionDescriptor(
    adm: ObservableObjectAdministration,
    { annotationType_ }: Annotation,
    key: PropertyKey,
    { value }: PropertyDescriptor
) {
    if (__DEV__ && !isFunction(value)) {
        die(
            `Cannot apply '${annotationType_}' to '${adm.name_}.${key.toString()}':` +
                `\n'${annotationType_}' can only be used on properties with a function value.`
        )
    }
}

function createActionDescriptor(
    adm: ObservableObjectAdministration,
    annotation: Annotation,
    key: PropertyKey,
    descriptor: PropertyDescriptor,
    // provides ability to disable safeDescriptors for prototypes
    safeDescriptors: boolean = globalState.safeDescriptors
) {
    assertActionDescriptor(adm, annotation, key, descriptor)
    let { value } = descriptor
    if (annotation.options_?.bound) {
        value = value.bind(adm.proxy_ ?? adm.target_)
    }
    return {
        value: createAction(
            annotation.options_?.name ?? key.toString(),
            value,
            annotation.options_?.autoAction ?? false
        ),
        // Non-configurable for classes
        // prevents accidental field redefinition in subclass
        configurable: safeDescriptors ? adm.isPlainObject_ : true,
        // https://github.com/mobxjs/mobx/pull/2641#issuecomment-737292058
        enumerable: false,
        // Non-obsevable, therefore non-writable
        // Also prevents rewriting in subclass constructor
        writable: safeDescriptors ? false : true
    }
}

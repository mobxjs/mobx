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
    assertPropertyConfigurable
} from "../internal"

export function createActionAnnotation(name: string, options?: object): Annotation {
    return {
        annotationType_: name,
        options_: options,
        make_,
        extend_
    }
}

function make_(adm: ObservableObjectAdministration, key: PropertyKey): boolean {
    let annotated = false
    let source = adm.target_
    // Bound action still applies normal action to prototypes,
    // makes sure super.actionBound() is also action
    let bound = this.options_?.bound ?? false
    while (source && source !== objectPrototype) {
        const descriptor = getDescriptor(source, key)
        if (descriptor) {
            if (source !== adm.target_) {
                // Prototype
                if (isAction(descriptor.value)) {
                    // A prototype could have been annotated already by other constructor,
                    // rest of the proto chain must be annotated already
                    return true
                }
                const actionDescriptor = createActionDescriptor(adm, this, key, descriptor, false)
                defineProperty(source, key, actionDescriptor)
            }
            if (source === adm.target_ || bound) {
                // Instance or bound
                const actionDescriptor = createActionDescriptor(adm, this, key, descriptor, bound)
                assertPropertyConfigurable(adm, key)
                adm.defineProperty_(key, actionDescriptor)
                // We want to bind only the closest one
                bound = false
            }
            annotated = true
        }
        source = Object.getPrototypeOf(source)
    }
    return annotated
}

function extend_(
    adm: ObservableObjectAdministration,
    key: PropertyKey,
    descriptor: PropertyDescriptor,
    proxyTrap: boolean
): boolean {
    const actionDescriptor = createActionDescriptor(adm, this, key, descriptor, this.options_.bound)
    return adm.defineProperty_(key, actionDescriptor, proxyTrap)
}

function assertActionDescriptor(
    adm: ObservableObjectAdministration,
    { annotationType_ }: Annotation, // TODO type
    key: PropertyKey,
    { value }: PropertyDescriptor
) {
    if (__DEV__ && !isFunction(value)) {
        die(
            `Cannot apply '${annotationType_}' to '${adm.name_}.${key.toString()}': ` +
                `${annotationType_} can only be used on properties with a function value.`
        )
    }
}

function createActionDescriptor(
    adm: ObservableObjectAdministration,
    annotation, // TODO type
    key: PropertyKey,
    descriptor: PropertyDescriptor,
    // Intentionall - 'action.bound' applies 'action' to prototypes
    bound: boolean
) {
    assertActionDescriptor(adm, annotation, key, descriptor)
    let { value } = descriptor
    if (bound) {
        value = value.bind(adm.target_)
    }
    return {
        value: createAction(
            annotation.options_?.name ?? key,
            value,
            annotation.options_?.autoAction ?? false
        ),
        // Non-configurable for classes
        // prevents accidental field redefinition in subclass
        configurable: adm.isPlainObject_,
        // https://github.com/mobxjs/mobx/pull/2641#issuecomment-737292058
        enumerable: false,
        // Non-obsevable, therefore non-writable
        // Also prevents rewriting in subclass constructor
        writable: false
    }
}

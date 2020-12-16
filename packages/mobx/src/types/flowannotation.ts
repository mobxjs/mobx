import {
    ObservableObjectAdministration,
    Annotation,
    defineProperty,
    getDescriptor,
    objectPrototype,
    die,
    flow,
    isFlow,
    isGenerator,
    assertPropertyConfigurable
} from "../internal"

export function createFlowAnnotation(name: string, options?: object): Annotation {
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
    while (source && source !== objectPrototype) {
        const descriptor = getDescriptor(source, key)
        if (descriptor) {
            if (source !== adm.target_) {
                // Prototype
                if (isFlow(descriptor.value)) {
                    // A prototype could have been annotated already by other constructor,
                    // rest of the proto chain must be annotated already
                    return true
                }
                const flowDescriptor = createFlowDescriptor(adm, this, key, descriptor)
                defineProperty(source, key, flowDescriptor)
            } else {
                const flowDescriptor = createFlowDescriptor(adm, this, key, descriptor)
                adm.defineProperty_(key, flowDescriptor)
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
    descriptor: PropertyDescriptor
): boolean {
    const flowDescriptor = createFlowDescriptor(adm, this, key, descriptor)
    return adm.defineProperty_(key, flowDescriptor)
}

function assertFlowDescriptor(
    adm: ObservableObjectAdministration,
    { annotationType_ }: Annotation,
    key: PropertyKey,
    { value }: PropertyDescriptor
) {
    if (__DEV__ && !isGenerator(value)) {
        die(
            `Cannot apply '${annotationType_}' to '${adm.name_}.${key.toString()}': ` +
                `${annotationType_} can only be used on properties with a generator function value.`
        )
    }
}

// TODO loud on devel loudAnnotationDescriptor
function createFlowDescriptor(
    adm: ObservableObjectAdministration,
    annotation: Annotation,
    key: PropertyKey,
    descriptor: PropertyDescriptor
): PropertyDescriptor {
    assertFlowDescriptor(adm, annotation, key, descriptor)
    return {
        value: flow(descriptor.value),
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

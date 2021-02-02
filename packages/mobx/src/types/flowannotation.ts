import {
    ObservableObjectAdministration,
    Annotation,
    defineProperty,
    getDescriptor,
    objectPrototype,
    die,
    flow,
    isFlow,
    recordAnnotationApplied,
    isFunction,
    globalState,
    storedAnnotationsSymbol
} from "../internal"

export function createFlowAnnotation(name: string, options?: object): Annotation {
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
    while (source && source !== objectPrototype) {
        const descriptor = getDescriptor(source, key)
        if (descriptor) {
            if (source !== adm.target_) {
                // Prototype
                if (isFlow(descriptor.value)) {
                    // A prototype could have been annotated already by other constructor,
                    // rest of the proto chain must be annotated already
                    annotated = true
                    break
                }
                const flowDescriptor = createFlowDescriptor(adm, this, key, descriptor, false)
                defineProperty(source, key, flowDescriptor)
            } else {
                const flowDescriptor = createFlowDescriptor(adm, this, key, descriptor)
                const definePropertyOutcome = adm.defineProperty_(key, flowDescriptor)
                if (!definePropertyOutcome) {
                    // Intercepted
                    return
                }
            }
            annotated = true
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
    const flowDescriptor = createFlowDescriptor(adm, this, key, descriptor)
    return adm.defineProperty_(key, flowDescriptor, proxyTrap)
}

function assertFlowDescriptor(
    adm: ObservableObjectAdministration,
    { annotationType_ }: Annotation,
    key: PropertyKey,
    { value }: PropertyDescriptor
) {
    if (__DEV__ && !isFunction(value)) {
        die(
            `Cannot apply '${annotationType_}' to '${adm.name_}.${key.toString()}':` +
                `\n'${annotationType_}' can only be used on properties with a generator function value.`
        )
    }
}

function createFlowDescriptor(
    adm: ObservableObjectAdministration,
    annotation: Annotation,
    key: PropertyKey,
    descriptor: PropertyDescriptor,
    // provides ability to disable safeDescriptors for prototypes
    safeDescriptors: boolean = globalState.safeDescriptors
): PropertyDescriptor {
    assertFlowDescriptor(adm, annotation, key, descriptor)
    return {
        value: flow(descriptor.value),
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

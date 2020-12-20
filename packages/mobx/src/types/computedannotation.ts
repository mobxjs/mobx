import {
    ObservableObjectAdministration,
    getDescriptor,
    objectPrototype,
    die,
    Annotation,
    recordAnnotationApplied
} from "../internal"

export function createComputedAnnotation(name: string, options?: object): Annotation {
    return {
        annotationType_: name,
        options_: options,
        make_,
        extend_
    }
}

function make_(adm: ObservableObjectAdministration, key: PropertyKey): void {
    let source = adm.target_
    // Getter and setter may be defined on different prototypes
    let get
    let set
    while (source && source !== objectPrototype) {
        const descriptor = getDescriptor(source, key)
        if (descriptor) {
            assertPartialComputedDescriptor(adm, this, key, descriptor)
            // use closest descriptor
            get = get ?? descriptor.get
            set = set ?? descriptor.set
            if (get && set) {
                break
            }
        }
        source = Object.getPrototypeOf(source)
    }
    if (get) {
        const definePropertyOutcome = adm.defineComputedProperty_(key, {
            ...this.options_,
            get,
            set
        })
        if (definePropertyOutcome) {
            recordAnnotationApplied(adm, this, key)
        }
    } else if (!this.isDecorator_) {
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
    assertComputedDescriptor(adm, this, key, descriptor)
    return adm.defineComputedProperty_(
        key,
        {
            ...this.options_,
            get: descriptor.get,
            set: descriptor.set
        },
        proxyTrap
    )
}

function assertComputedDescriptor(
    adm: ObservableObjectAdministration,
    annotation: Annotation,
    key: PropertyKey,
    { get }: PropertyDescriptor
) {
    if (__DEV__ && !get) {
        die(invalidComputedDescriptorMessage(adm, annotation, key))
    }
}

function assertPartialComputedDescriptor(
    adm: ObservableObjectAdministration,
    annotation: Annotation,
    key: PropertyKey,
    { get, set }: PropertyDescriptor
) {
    if (__DEV__ && !get && !set) {
        die(invalidComputedDescriptorMessage(adm, annotation, key))
    }
}

function invalidComputedDescriptorMessage(
    adm: ObservableObjectAdministration,
    { annotationType_ }: Annotation,
    key: PropertyKey
) {
    return (
        `Cannot apply '${annotationType_}' to '${adm.name_}.${key.toString()}':` +
        `\n'${annotationType_}' can only be used on getter(+setter) properties.`
    )
}

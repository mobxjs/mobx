import {
    ObservableObjectAdministration,
    getDescriptor,
    objectPrototype,
    die,
    Annotation,
    recordAnnotationApplied,
    storedAnnotationsSymbol
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
    while (source && source !== objectPrototype) {
        const descriptor = getDescriptor(source, key)
        if (descriptor) {
            assertComputedDescriptor(adm, this, key, descriptor)
            const definePropertyOutcome = adm.defineComputedProperty_(key, {
                ...this.options_,
                get: descriptor.get,
                set: descriptor.set
            })
            if (!definePropertyOutcome) {
                // Intercepted
                return
            }
            recordAnnotationApplied(adm, this, key)
            return
        }
        source = Object.getPrototypeOf(source)
    }
    if (!adm.target_[storedAnnotationsSymbol]?.[key]) {
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
    { annotationType_ }: Annotation,
    key: PropertyKey,
    { get }: PropertyDescriptor
) {
    if (__DEV__ && !get) {
        die(
            `Cannot apply '${annotationType_}' to '${adm.name_}.${key.toString()}':` +
                `\n'${annotationType_}' can only be used on getter(+setter) properties.`
        )
    }
}

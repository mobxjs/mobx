import {
    ObservableObjectAdministration,
    getDescriptor,
    objectPrototype,
    die,
    Annotation
} from "../internal"

export function createComputedAnnotation(name: string, options?: object): Annotation {
    return {
        annotationType_: name,
        options_: options,
        make_,
        extend_
    }
}

function make_(adm: ObservableObjectAdministration, key: PropertyKey): boolean {
    let source = adm.target_
    while (source && source !== objectPrototype) {
        const descriptor = getDescriptor(source, key)
        if (descriptor) {
            assertComputedDescriptor(adm, this, key, descriptor)
            adm.defineComputedProperty_(key, {
                ...this.options_,
                get: descriptor.get,
                set: descriptor.set
            })
            // Use the closest descriptor
            return true
        }
        source = Object.getPrototypeOf(source)
    }
    return false
}

function extend_(
    adm: ObservableObjectAdministration,
    key: PropertyKey,
    descriptor: PropertyDescriptor,
    proxyTrap: boolean
): boolean {
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
                `\n'${annotationType_}' can only be used on getter properties.`
        )
    }
}

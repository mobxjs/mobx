import {
    ObservableObjectAdministration,
    getDescriptor,
    deepEnhancer,
    die,
    assertPropertyConfigurable,
    Annotation
} from "../internal"

export function createObservableAnnotation(name: string, options?: object): Annotation {
    return {
        annotationType_: name,
        options_: options,
        make_,
        extend_
    }
}

function make_(adm: ObservableObjectAdministration, key: PropertyKey): boolean {
    const descriptor = getDescriptor(adm.target_, key)
    if (descriptor) {
        assertObservableDescriptor(adm, this, key, descriptor)
        assertPropertyConfigurable(adm, key)
        adm.defineObservableProperty_(
            key,
            descriptor.value,
            this.options_?.enhancer ?? deepEnhancer
        )
        return true
    }
    return false
}

function extend_(
    adm: ObservableObjectAdministration,
    key: PropertyKey,
    descriptor: PropertyDescriptor,
    proxyTrap: boolean
): boolean {
    assertObservableDescriptor(adm, this, key, descriptor)
    return adm.defineObservableProperty_(
        key,
        descriptor.value,
        this.options_?.enhancer ?? deepEnhancer,
        proxyTrap
    )
}

function assertObservableDescriptor(
    adm: ObservableObjectAdministration,
    { annotationType_ }: Annotation,
    key: PropertyKey,
    descriptor: PropertyDescriptor
) {
    if (__DEV__ && !("value" in descriptor)) {
        die(
            `Cannot apply '${annotationType_}' to '${adm.name_}.${key.toString()}': ` +
                `${annotationType_} can't be used on getter/setter properties`
        )
    }
}

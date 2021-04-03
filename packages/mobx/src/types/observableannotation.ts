import {
    ObservableObjectAdministration,
    deepEnhancer,
    die,
    Annotation,
    MakeResult
} from "../internal"

export function createObservableAnnotation(name: string, options?: object): Annotation {
    return {
        annotationType_: name,
        options_: options,
        make_,
        extend_
    }
}

function make_(
    adm: ObservableObjectAdministration,
    key: PropertyKey,
    descriptor: PropertyDescriptor
): MakeResult {
    return this.extend_(adm, key, descriptor, false) === null ? MakeResult.Cancel : MakeResult.Break
}

function extend_(
    adm: ObservableObjectAdministration,
    key: PropertyKey,
    descriptor: PropertyDescriptor,
    proxyTrap: boolean
): boolean | null {
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
            `Cannot apply '${annotationType_}' to '${adm.name_}.${key.toString()}':` +
                `\n'${annotationType_}' cannot be used on getter/setter properties`
        )
    }
}

import {
    ObservableObjectAdministration,
    die,
    Annotation,
    MakeResult,
    assert20223DecoratorType,
    $mobx,
    asObservableObject,
    ComputedValue
} from "../internal"

export function createComputedAnnotation(name: string, options?: object): Annotation {
    return {
        annotationType_: name,
        options_: options,
        make_,
        extend_,
        decorate_20223_
    }
}

function make_(
    this: Annotation,
    adm: ObservableObjectAdministration,
    key: PropertyKey,
    descriptor: PropertyDescriptor
): MakeResult {
    return this.extend_(adm, key, descriptor, false) === null ? MakeResult.Cancel : MakeResult.Break
}

function extend_(
    this: Annotation,
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

function decorate_20223_(this: Annotation, get, context: ClassGetterDecoratorContext) {
    if (__DEV__) {
        assert20223DecoratorType(context, ["getter"])
    }
    const ann = this
    const { name: key, addInitializer } = context
    let computedValues: WeakMap<object, ComputedValue<any>> | undefined

    // Defer ComputedValue creation until first access — avoids allocating
    // ComputedValues for getters that are never read on a given instance.
    // The factory is materialised by ObservableObjectAdministration on demand.
    function createComputedValue(target: object, adm: ObservableObjectAdministration) {
        const options = {
            ...ann.options_,
            get,
            context: target
        }
        options.name ||= __DEV__
            ? `${adm.name_}.${key.toString()}`
            : `ObservableObject.${key.toString()}`
        return new ComputedValue(options)
    }

    addInitializer(function () {
        const adm: ObservableObjectAdministration = asObservableObject(this)[$mobx]
        const target = this as object
        const observable = adm.values_.get(key)
        if (observable instanceof ComputedValue && observable.derivation !== get) {
            adm.values_.delete(key)
        }
        ;(adm.lazyComputedKeys_ ??= new Map()).set(key, () => createComputedValue(target, adm))
    })

    return function () {
        const adm: ObservableObjectAdministration = this[$mobx]
        const observable = adm.values_.get(key)
        if (observable instanceof ComputedValue && observable.derivation !== get) {
            let computed = computedValues?.get(this)
            if (!computed) {
                computed = createComputedValue(this, adm)
                ;(computedValues ??= new WeakMap()).set(this, computed)
            }
            return computed.get()
        }
        return adm.getObservablePropValue_(key)
    }
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

import {
    ObservableObjectAdministration,
    deepEnhancer,
    die,
    Annotation,
    MakeResult,
    assert20223DecoratorType,
    ObservableValue,
    asObservableObject,
    $mobx
} from "../internal"

export function createObservableAnnotation(name: string, options?: object): Annotation {
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
    assertObservableDescriptor(adm, this, key, descriptor)
    return adm.defineObservableProperty_(
        key,
        descriptor.value,
        this.options_?.enhancer ?? deepEnhancer,
        proxyTrap
    )
}

function decorate_20223_(
    this: Annotation,
    desc,
    context: ClassAccessorDecoratorContext | ClassFieldDecoratorContext
) {
    if (__DEV__) {
        if (context.kind === "field") {
            throw die(
                `Please use \`@observable accessor ${String(
                    context.name
                )}\` instead of \`@observable ${String(context.name)}\``
            )
        }
        assert20223DecoratorType(context, ["accessor"])
    }

    const ann = this
    const { kind, name } = context

    if (kind !== "accessor") {
        return
    }

    // Defer ObservableValue construction until first access. The factory is
    // materialised by ObservableObjectAdministration on demand, so unused
    // fields on wide classes never pay the per-instance allocation cost.
    function registerLazy(target: any, value: any): ObservableObjectAdministration {
        const adm: ObservableObjectAdministration = asObservableObject(target)[$mobx]
        ;(adm.lazyObservableKeys_ ??= new Map()).set(
            name,
            () =>
                new ObservableValue(
                    value,
                    ann.options_?.enhancer ?? deepEnhancer,
                    __DEV__
                        ? `${adm.name_}.${name.toString()}`
                        : `ObservableObject.${name.toString()}`,
                    false
                )
        )
        return adm
    }

    return {
        get() {
            const adm: ObservableObjectAdministration =
                this[$mobx] ?? registerLazy(this, desc.get.call(this))
            return adm.getObservablePropValue_(name)
        },
        set(value) {
            const adm: ObservableObjectAdministration = this[$mobx] ?? registerLazy(this, value)
            return adm.setObservablePropValue_(name, value)
        },
        init(value) {
            registerLazy(this, value)
            return value
        }
    }
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

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

    addInitializer(function () {
        const adm: ObservableObjectAdministration = asObservableObject(this)[$mobx]
        const target = this

        const factory = (): ComputedValue<any> => {
            const options = {
                ...ann.options_,
                get,
                context: target
            }

            options.name ||= __DEV__
                ? `${adm.name_}.${key.toString()}`
                : `ObservableObject.${key.toString()}`

            const cv = new ComputedValue(options)

            if (!adm.values_.has(key)) {
                adm.values_.set(key, cv)
            }
            adm.computedEntries_?.set(key, cv)
            if (adm.computedGetterEntries_) {
                adm.computedGetterEntries_.set(get, cv)
            }

            return cv
        }
        // Check if a parent class already registered a computed for this key (inheritance)
        const lazyMap = adm.lazyComputedKeys_
        const existing = lazyMap
            ? (lazyMap.get(key) as (() => ComputedValue<any>) | undefined) ??
              (adm.computedEntries_?.get(key) as (() => ComputedValue<any>) | undefined)
            : (adm.computedEntries_?.get(key) as (() => ComputedValue<any>) | undefined)
        if (existing && typeof existing === "function") {
            // Inheritance detected → find parent's getter from prototype chain
            let parentGet: Function | undefined
            let proto = Object.getPrototypeOf(target)
            // Skip prototypes until we find our own replacement getter
            while (proto && proto !== Object.prototype) {
                const desc = Object.getOwnPropertyDescriptor(proto, key)
                if (desc?.get && (desc.get as any).__mobx_get === get) {
                    proto = Object.getPrototypeOf(proto)
                    break
                }
                proto = Object.getPrototypeOf(proto)
            }
            // Now find the parent's replacement getter
            while (proto && proto !== Object.prototype) {
                const desc = Object.getOwnPropertyDescriptor(proto, key)
                if (desc?.get && (desc.get as any).__mobx_get) {
                    parentGet = (desc.get as any).__mobx_get
                    break
                }
                proto = Object.getPrototypeOf(proto)
            }
            if (parentGet) {
                ;(adm.computedGetterEntries_ ??= new Map()).set(parentGet, existing)
            }
            // Remove parent's entry from lazyComputedKeys_ (now in computedGetterEntries_)
            adm.lazyComputedKeys_?.delete(key)
            ;(adm.computedEntries_ ??= new Map()).set(key, factory)
        } else {
            // Common case (no inheritance) → use lazyComputedKeys_ (like main branch)
            ;(adm.lazyComputedKeys_ ??= new Map()).set(key, factory)
        }
    })

    if (typeof get === "function") {
        const replacementGetter = function () {
            return this[$mobx].readComputed_(key, get)
        }
        // Store original getter for child class inheritance detection
        ;(replacementGetter as any).__mobx_get = get
        return replacementGetter
    }

    return function () {
        return this[$mobx].getObservablePropValue_(key)
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

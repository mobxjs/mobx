import {
    ObservableObjectAdministration,
    deepEnhancer,
    die,
    Annotation,
    MakeResult,
    assert20223DecoratorType,
    asObservableObject,
    getDecoratedMemberKey,
    $mobx,
    ObservableAccessorField,
    UnenhancedValue,
    getAccessorFields,
    globalState,
    referenceEnhancer,
    isObject,
    isFunction
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
        this.options_?.enhancer_ ?? deepEnhancer,
        proxyTrap
    )
}

export function decorateObservable20223_(
    annotation: Annotation,
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

    const ann = annotation
    const { kind } = context

    if (kind !== "accessor") {
        return
    }

    const key = getDecoratedMemberKey(context)
    const enhancer = ann.options_?.enhancer_ ?? deepEnhancer
    // No ObservableValue until the field needs one, see `ObservableAccessorField`
    const field: ObservableAccessorField = {
        enhancer_: enhancer,
        get_: desc.get,
        set_: desc.set,
        name_: __DEV__ ? context.name.toString() : `ObservableObject.${context.name.toString()}`,
        index_: Infinity
    }
    // The field lists this field is part of: one per class that has the field, so one in most cases
    let lastFields: Map<PropertyKey, ObservableAccessorField> | undefined
    let registeredIn: WeakSet<object> | undefined

    return {
        get() {
            const adm: ObservableObjectAdministration | undefined = this[$mobx]
            if (adm === undefined) {
                // Not an instance, or one whose constructor has yet to initialize any field
                return desc.get.call(this)
            }
            const observable = adm.values_.get(key)
            if (observable !== undefined) {
                return observable.get()
            }
            if (globalState.trackingDerivation !== null && adm.isAccessorFieldInitialized_(field)) {
                return adm.materializeAccessorField_(key, field).get()
            }
            return adm.getAccessorFieldValue_(field)
        },
        set(value) {
            const adm: ObservableObjectAdministration =
                this[$mobx] ?? asObservableObject(this)[$mobx]
            return adm.setObservablePropValue_(key, value, field)
        },
        init(value) {
            const adm: ObservableObjectAdministration = asObservableObject(this)[$mobx]
            const fields = (adm.accessorFields_ ??= getAccessorFields(this))
            if (fields !== lastFields) {
                lastFields = fields
                // The fields of a superclass are initialized first, so the field of a subclass
                // replaces one with the same key the first time around, and neither registers twice
                if (!registeredIn?.has(fields)) {
                    ;(registeredIn ??= new WeakSet()).add(fields)
                    fields.set(key, field)
                    if (field.index_ === Infinity) {
                        field.index_ = adm.accessorFieldsInitialized_
                    }
                }
            }
            adm.accessorFieldsInitialized_++
            if (adm.values_.size !== 0 && adm.values_.has(key)) {
                // Written before it was initialized, and that value wins
                return undefined
            }
            return enhancer === referenceEnhancer || !(isObject(value) || isFunction(value))
                ? value
                : new UnenhancedValue(value)
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

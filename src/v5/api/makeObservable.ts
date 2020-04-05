import {
    asObservableObject,
    isPlainObject,
    hasProp,
    addHiddenProp,
    action,
    fail,
    isAction,
    deepEnhancer,
    shallowEnhancer,
    referenceEnhancer,
    computed,
    observable
} from "../internal"

export type Decorator = {
    decoratorType:
        | "observable"
        | "observable.ref"
        | "observable.shallow"
        | "computed"
        | "computed.struct"
        | "action"
        | "action.bound"
    options?: any
}

export type Decorators<T> = { [K in keyof T]?: Decorator }

export type DecoratorExclusions<T> = { [K in keyof T]?: Decorator | false }

function getDecoratorsFromMetaData<T extends Object>(target: T): Decorators<T> {
    // TODO: implement, if not available, throw
    return {}
}

function makeAction(target, key, name, fn) {
    addHiddenProp(target, key, action(name || key, fn))
}

function notFound(key) {
    fail(`Cannot decorate unknown member '${key}'`)
}

export function makeObservable<T extends Object>(
    target: T,
    decorators: Decorators<T> = getDecoratorsFromMetaData(target)
) {
    const isPlain = isPlainObject(target)
    const proto = isPlain ? target : Reflect.getPrototypeOf(target) // TODO: ES5 compatible?
    const adm = asObservableObject(target)
    Object.getOwnPropertyNames(decorators).forEach(key => {
        const decorator = decorators[key]
        // @ts-ignore
        if (decorator === false) {
            return
        }
        switch (decorator.decoratorType) {
            case "action":
                if (hasProp(target, key)) {
                    makeAction(target, key, decorator.options, target[key])
                } else if (!isPlain && hasProp(proto, key)) {
                    if (!isAction(proto[key])) makeAction(proto, key, decorator.options, proto[key])
                } else {
                    notFound(key)
                }
                break
            case "action.bound":
                if (hasProp(target, key)) {
                    makeAction(target, key, decorator.options, target[key].bind(target))
                } else if (!isPlain && hasProp(proto, key)) {
                    makeAction(target, key, decorator.options, proto[key].bind(target))
                } else {
                    notFound(key)
                }
                break
            case "computed.struct":
            case "computed": {
                const descriptor = Object.getOwnPropertyDescriptor(proto, key)
                if (!descriptor) {
                    notFound(key)
                } else {
                    // TODO: can be done cleaner?
                    adm.addComputedProp(proto, key, {
                        get: descriptor.get,
                        set: descriptor.set,
                        compareStructural: decorator.decoratorType === "computed.struct",
                        ...decorator.options
                    })
                }
                break
            }
            case "observable":
            case "observable.ref":
            case "observable.shallow": {
                const descriptor = Object.getOwnPropertyDescriptor(proto, key)
                if (!descriptor) {
                    notFound(key)
                } else {
                    adm.addObservableProp(
                        key,
                        descriptor.value,
                        decorator.decoratorType === "observable"
                            ? deepEnhancer
                            : decorator.decoratorType === "observable.shallow"
                            ? shallowEnhancer
                            : referenceEnhancer
                    )
                }
                break
            }
            default:
                fail("invalid decorator for " + key)
        }
    })
}

export function makeAutoObservable<T extends Object>(target: T, excludes: DecoratorExclusions<T>) {
    let decorators = { ...excludes }
    // TODO: check if no superclass
    if (!isPlainObject(target)) {
        const proto = Object.getPrototypeOf(target)
        Object.keys(proto).forEach(key => {
            if (key in excludes) return
            const prop = Object.getOwnPropertyDescriptor(proto, key)!
            if (prop.get) {
                decorators[key] = computed
            } else if (typeof prop.value === "function") {
                decorators[key] = action.bound
            }
        })
    }
    Object.keys(target).forEach(key => {
        if (key in excludes) return
        const prop = Object.getOwnPropertyDescriptor(target, key)!
        if (prop.get) {
            decorators[key] = computed
        } else if (typeof prop.value === "function") {
            decorators[key] = action.bound
        } else {
            decorators[key] = observable
        }
    })
    return makeObservable(target, decorators as any)
}

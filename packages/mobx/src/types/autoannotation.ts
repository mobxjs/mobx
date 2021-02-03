import {
    ObservableObjectAdministration,
    getDescriptor,
    deepEnhancer,
    die,
    Annotation,
    recordAnnotationApplied,
    objectPrototype,
    storedAnnotationsSymbol,
    isAction,
    defineProperty,
    createAction,
    referenceEnhancer,
    globalState,
    flow,
    isFlow,
    isGenerator
} from "../internal"

const AUTO = "true"

export const autoAnnotation: Annotation = createAutoAnnotation()

// TODO deep => enhancer?
export function createAutoAnnotation(options?: object): Annotation {
    return {
        annotationType_: AUTO,
        options_: options,
        make_,
        extend_
    }
}

function make_(adm: ObservableObjectAdministration, key: PropertyKey): void {
    let annotated = false
    let source = adm.target_
    while (source && source !== objectPrototype) {
        const descriptor = getDescriptor(source, key)
        if (descriptor) {
            if (descriptor.get) {
                // getter -> computed
                const definePropertyOutcome = adm.defineComputedProperty_(key, {
                    get: descriptor.get,
                    set: descriptor.set
                })
                if (!definePropertyOutcome) {
                    // intercepted
                    return
                }
                annotated = true
                break // use closest
            } else if (descriptor.set) {
                // lone setter -> ignore
                // TODO wrap setter in action
            } else if (source !== adm.target_ && typeof descriptor.value === "function") {
                // function on proto
                if (isAction(descriptor.value) || isFlow(descriptor.value)) {
                    // already annotated
                    annotated = true
                    break // super must be annotated already as well
                } else if (this.options_?.autoBind) {
                    // bound
                    let { value } = descriptor
                    value = value.bind(adm.proxy_ ?? adm.target_)
                    const definePropertyOutcome = adm.defineProperty_(key, {
                        configurable: globalState.safeDescriptors ? adm.isPlainObject_ : true,
                        writable: false, // not-observable
                        enumerable: false,
                        value: isGenerator(value)
                            ? flow(value)
                            : createAction(key.toString(), value)
                    })
                    if (!definePropertyOutcome) {
                        // intercepted
                        return
                    }
                    annotated = true
                    break // use closest
                } else {
                    // non-bound
                    defineProperty(source, key, {
                        configurable: true,
                        writable: true,
                        enumerable: false,
                        value: isGenerator(descriptor.value)
                            ? flow(descriptor.value)
                            : createAction(key.toString(), descriptor.value, true)
                    })
                    annotated = true
                    // continue
                }
            } else {
                // other -> observable
                // Copy props from proto as well, see test:
                // "decorate should work with Object.create"

                let { value } = descriptor
                if (typeof value === "function" && this.options_?.autoBind) {
                    // if function respect autoBind option
                    value = value.bind(adm.proxy_ ?? adm.target_)
                }

                const definePropertyOutcome = adm.defineObservableProperty_(
                    key,
                    value,
                    this.options_?.deep === false ? referenceEnhancer : deepEnhancer
                )
                if (!definePropertyOutcome) {
                    // intercepted
                    return
                }
                annotated = true
                break // use closest
            }
        }
        source = Object.getPrototypeOf(source)
    }
    if (annotated) {
        recordAnnotationApplied(adm, this, key)
    } else if (!adm.target_[storedAnnotationsSymbol]?.[key]) {
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
    if (descriptor.get) {
        // getter
        return adm.defineComputedProperty_(key, {
            get: descriptor.get,
            set: descriptor.set
        })
    } else if (descriptor.set) {
        // setter
        return adm.defineProperty_(key, {
            configurable: globalState.safeDescriptors ? adm.isPlainObject_ : true,
            set: createAction(key.toString(), descriptor.set) as (v: any) => void
        })
    } else {
        // other
        let { value } = descriptor

        if (typeof value === "function" && this.options_?.autoBind) {
            // if function respect autoBind option
            value = value.bind(adm.proxy_ ?? adm.target_)
        }

        return adm.defineObservableProperty_(
            key,
            value,
            this.options_?.deep === false ? referenceEnhancer : deepEnhancer,
            proxyTrap
        )
    }
}

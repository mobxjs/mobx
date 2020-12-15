// annotateProp
function make2_(key: PropertyKey, annotation: Annotation | boolean, options): boolean {
    if (annotation === false) {
        return true
    }
    const adm = this
    assertNotAnnotated2(adm, annotation, key)

    let annotated = false
    let source = this.target_
    // Bound action still applies normal action to prototypes,
    // makes sure super.actionBound() is also action
    let bound: boolean | undefined = undefined
    while (source && source !== objectPrototype) {
        const descriptor = getDescriptor(source, key)
        // Infer annotation if necessary
        if (annotation === true) {
            annotation = inferAnnotationFromDescriptor(descriptor) // TODO
            if (annotation === true) {
                annotation = adm.defaultAnnotation_
            }
        }
        annotation = annotation as Annotation
        if (annotation.annotationType_ === "action") {
            bound ??= !!((annotation as Annotation).options_?.bound ?? options?.autoBind ?? false)
            bound = bound as boolean
            if (descriptor) {
                if (source !== adm.target_) {
                    // Prototype
                    if (isAction(descriptor.value)) {
                        // A prototype could have been annotated already by other constructor,
                        // rest of the proto chain must be annotated already
                        annotated = true
                        break
                    }
                    const actionDescriptor = createActionDescriptor(
                        adm,
                        annotation,
                        key,
                        descriptor,
                        false
                    )
                    defineProperty(source, key, actionDescriptor)
                }
                if (source === adm.target_ || bound) {
                    // Instance or bound
                    const actionDescriptor = createActionDescriptor(
                        adm,
                        annotation,
                        key,
                        descriptor,
                        bound
                    )
                    assertPropertyConfigurable(adm, key)
                    adm.defineProperty_(key, actionDescriptor)
                    // We want to bind only the closest one
                    bound = false
                }
                annotated = true
            }
        } else if (annotation.annotationType_ === "flow") {
            if (descriptor) {
                if (source !== adm.target_) {
                    // Prototype
                    if (isFlow(descriptor.value)) {
                        // A prototype could have been annotated already by other constructor,
                        // rest of the proto chain must be annotated already
                        return true
                    }
                    const flowDescriptor = createFlowDescriptor(adm, this, key, descriptor)
                    defineProperty(source, key, flowDescriptor)
                } else {
                    const flowDescriptor = createFlowDescriptor(adm, this, key, descriptor)
                    assertPropertyConfigurable(adm, key)
                    adm.defineProperty_(key, flowDescriptor)
                }
                annotated = true
            }
        }

        source = Object.getPrototypeOf(source)
    }
    if (annotated) {
        recordAnnotationApplied(annotation, annotation, key)
    } else if (!annotation.isDecorator_) {
        // Throw on missing key, except for decorators:
        // Decorator annotations are collected from whole prototype chain.
        // When called from super() some props may not exist yet.
        // However we don't have to worry about missing prop,
        // because the decorator must have been applied to something.
        // TODO improve error
        // TODO perhpas move this check to makeObservable
        die(1, key)
    }
    return annotated
}

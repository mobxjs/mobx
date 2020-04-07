export type Annotation = {
    annotationType:
        | "observable"
        | "observable.ref"
        | "observable.shallow"
        | "observable.struct"
        | "computed"
        | "computed.struct"
        | "action"
        | "action.bound"
    arg?: any
}

export type AnnotationsMap<T> = {
    [K in keyof T]?:
        | Annotation
        | true /* follow the default decorator, usually deep */
        | false /* don't decorate this property */
}

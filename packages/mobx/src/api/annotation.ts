import { ObservableObjectAdministration } from "../internal"

export type Annotation = {
    annotationType_: string
    make_(adm: ObservableObjectAdministration, key: PropertyKey): boolean
    extend_(
        adm: ObservableObjectAdministration,
        key: PropertyKey,
        descriptor: PropertyDescriptor,
        proxyTrap: boolean
    ): boolean
    options_?: any
    isDecorator_?: boolean
}
// TODO delete
/*
export type Annotation = {
    annotationType_:
        | "observable"
        | "observable.ref"
        | "observable.shallow"
        | "observable.struct"
        | "computed"
        | "computed.struct"
        | "action"
        | "action.bound"
        | "autoAction"
        | "autoAction.bound"
        | "flow"
        | "override"
    makeObservable_(adm: ObservableObjectAdministration, key: PropertyKey): void
    extendObservable_(
        adm: ObservableObjectAdministration,
        key: PropertyKey,
        descriptor: PropertyDescriptor
    ): void
    isDecorator_?: boolean
    //[key: string]: unknown // TODO
}*/

export type AnnotationMapEntry =
    | Annotation
    | true /* follow the default decorator, usually deep */
    | false /* don't decorate this property */

// AdditionalFields can be used to declare additional keys that can be used, for example to be able to
// declare annotations for private/ protected members, see #2339
export type AnnotationsMap<T, AdditionalFields extends PropertyKey> = {
    [P in Exclude<keyof T, "toString">]?: AnnotationMapEntry
} &
    Record<AdditionalFields, AnnotationMapEntry>

import {
    IArrayDidChange,
    IComputedValue,
    IMapDidChange,
    IObjectDidChange,
    IObservableArray,
    IObservableValue,
    IValueDidChange,
    Lambda,
    ObservableMap,
    getAdministration,
    ObservableSet,
    ISetDidChange,
    isFunction,
    isComputedValue,
    isObservableArray,
    isObservableMap,
    isObservableObject,
    isObservableSet,
    autorun,
    registerListener,
    untrackedEnd,
    untrackedStart,
    UPDATE,
    die
} from "../internal"

export function observe<T>(
    value: IObservableValue<T> | IComputedValue<T>,
    listener: (change: IValueDidChange<T>) => void,
    fireImmediately?: boolean
): Lambda
export function observe<T>(
    observableArray: IObservableArray<T> | Array<T>,
    listener: (change: IArrayDidChange<T>) => void,
    fireImmediately?: boolean
): Lambda
export function observe<V>(
    // ObservableSet/ObservableMap are required despite they implement Set/Map: https://github.com/mobxjs/mobx/pull/3180#discussion_r746542929
    observableSet: ObservableSet<V> | Set<V>,
    listener: (change: ISetDidChange<V>) => void,
    fireImmediately?: boolean
): Lambda
export function observe<K, V>(
    observableMap: ObservableMap<K, V> | Map<K, V>,
    listener: (change: IMapDidChange<K, V>) => void,
    fireImmediately?: boolean
): Lambda
export function observe<K, V>(
    observableMap: ObservableMap<K, V> | Map<K, V>,
    property: K,
    listener: (change: IValueDidChange<V>) => void,
    fireImmediately?: boolean
): Lambda
export function observe(
    object: Object,
    listener: (change: IObjectDidChange) => void,
    fireImmediately?: boolean
): Lambda
export function observe<T, K extends keyof T>(
    object: T,
    property: K,
    listener: (change: IValueDidChange<T[K]>) => void,
    fireImmediately?: boolean
): Lambda
export function observe(thing, propOrCb?, cbOrFire?, fireImmediately?): Lambda {
    if (isFunction(cbOrFire)) {
        return observeObservableProperty(thing, propOrCb, cbOrFire, fireImmediately)
    } else {
        return observeObservable(thing, propOrCb, cbOrFire)
    }
}

function observeObservable(thing, listener, fireImmediately: boolean) {
    const adm = getAdministration(thing)

    if (isObservableArray(thing)) {
        if (fireImmediately) {
            listener({
                observableKind: "array",
                object: adm.proxy_,
                debugObjectName: adm.atom_.name_,
                type: "splice",
                index: 0,
                added: adm.values_.slice(),
                addedCount: adm.values_.length,
                removed: [],
                removedCount: 0
            })
        }
    } else if (isObservableMap(thing)) {
        if (__DEV__ && fireImmediately === true) {
            die("`observe` doesn't support fireImmediately=true in combination with maps.")
        }
    } else if (isObservableSet(thing)) {
        if (__DEV__ && fireImmediately === true) {
            die("`observe` doesn't support fireImmediately=true in combination with sets.")
        }
    } else if (isObservableObject(thing)) {
        if (__DEV__ && fireImmediately === true) {
            die("`observe` doesn't support the fire immediately property for observable objects.")
        }
    } else {
        return observeValue(adm, listener, fireImmediately)
    }

    return registerListener(adm, listener)
}

function observeObservableProperty(thing, property, listener, fireImmediately: boolean) {
    return observeValue(getAdministration(thing, property), listener, fireImmediately)
}

function observeValue(adm, listener, fireImmediately: boolean) {
    if (isComputedValue(adm)) {
        let firstTime = true
        let prevValue: any = undefined
        return autorun(() => {
            const newValue = adm.get()
            if (!firstTime || fireImmediately) {
                const prevU = untrackedStart()
                listener({
                    observableKind: "computed",
                    debugObjectName: adm.name_,
                    type: UPDATE,
                    object: adm,
                    newValue,
                    oldValue: prevValue
                })
                untrackedEnd(prevU)
            }
            firstTime = false
            prevValue = newValue
        })
    }

    if (fireImmediately) {
        listener({
            observableKind: "value",
            debugObjectName: adm.name_,
            object: adm,
            type: UPDATE,
            newValue: adm.value_,
            oldValue: undefined
        })
    }
    return registerListener(adm, listener)
}

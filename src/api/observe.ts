import {IObservableArray, IArrayChange, IArraySplice, isObservableArray} from "../types/observablearray";
import {ObservableMap, IObservableMapChange, isObservableMap} from "../types/observablemap";
import {IObjectChange, isObservableObject} from "../types/observableobject";
import {isObservable, observable} from "./observable";
import {Lambda, isPlainObject} from "../utils/utils";
import {autorun} from "../api/autorun";

export function observe<T>(observableArray:IObservableArray<T>, listener:(change:IArrayChange<T>|IArraySplice<T>) => void): Lambda;
export function observe<T>(observableMap:ObservableMap<T>, listener:(change:IObservableMapChange<T>) => void): Lambda;
export function observe(func:()=>void): Lambda;
export function observe<T extends Object>(object:T, listener:(change:IObjectChange<any, T>) => void): Lambda;
export function observe<T extends Object,Y>(object:T, prop: string, listener:(newValue:Y, oldValue?: Y) => void): Lambda;
export function observe(thing, property?, listener?):Lambda {
    if (arguments.length === 2) {
        listener = property;
        property = undefined;
    }
    if (typeof thing === "function") {
        console.error("[mobservable.observe] is deprecated in combination with a function, use 'mobservable.autorun' instead");
        return autorun(thing);
    }
    if (typeof listener !== "function")
        throw new Error("[mobservable.observe] expected second argument to be a function");
    if (isObservableArray(thing))
        return thing.observe(listener);
    if (isObservableMap(thing)) {
        if (property) {
            if (!thing._has(property))
                throw new Error("[mobservable.observe] the provided observable map has no key with name: " + property);
            return thing._data[property].observe(listener);
        } else {
            return thing.observe(listener);
        }
    }
    if (isObservableObject(thing)) {
        if (property) {
            if (!isObservable(thing, property))
                throw new Error("[mobservable.observe] the provided object has no observable property with name: " + property);
            return thing.$mobservable.values[property].observe(listener);
        }
        return thing.$mobservable.observe(listener);
    }
    if (isPlainObject(thing))
        return (<any>observable(thing)).$mobservable.observe(listener);
    throw new Error("[mobservable.observe] first argument should be an observable array, observable map, observable object or plain object.");
}
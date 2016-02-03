import {ObservableArray} from "../types/observablearray";
import {ObservableMap} from "../types/observablemap";
// TODO: remove all default exports
import ObservableValue from "../types/observablevalue";
import {isObservable} from "../api/observable";
import {isPlainObject} from "../utils/utils";

/**
    * Basically, a deep clone, so that no reactive property will exist anymore.
    */
export function toJSON(source, detectCycles: boolean = true, __alreadySeen:[any,any][] = null) {
    // optimization: using ES6 map would be more efficient!
    function cache(value) {
        if (detectCycles)
            __alreadySeen.push([source, value]);
        return value;
    }

    if (detectCycles && __alreadySeen === null)
        __alreadySeen = [];
    if (detectCycles && source !== null && typeof source === "object") {
        for (let i = 0, l = __alreadySeen.length; i < l; i++)
            if (__alreadySeen[i][0] === source)
                return __alreadySeen[i][1];
    }

    if (!source)
        return source;
    if (Array.isArray(source) || source instanceof ObservableArray) {
        const res = cache([]);
        res.push(...source.map(value => toJSON(value, detectCycles, __alreadySeen)));
        return res;
    }
    if (source instanceof ObservableMap) {
        const res = cache({});
        source.forEach(
            (value, key) => res[key] = toJSON(value, detectCycles, __alreadySeen)
        );
        return res;
    }
    if (typeof source === "object" && isPlainObject(source)) {
        const res = cache({});
        for (var key in source) if (source.hasOwnProperty(key))
            res[key] = toJSON(source[key], detectCycles, __alreadySeen);
        return res;
    }
    if (isObservable(source) && source.$mobservable instanceof ObservableValue)
        return toJSON(source(), detectCycles, __alreadySeen);
    return source;
}

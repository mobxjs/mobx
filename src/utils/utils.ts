/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */

export function invariant(check: boolean) {
    if (!check)
        throw new Error("[mobservable] Invariant failed, please report this as a bug. Be sure to including the stacktrace of this error.");
}

const deprecatedMessages = [];
export function deprecated(msg: string) {
    if (deprecatedMessages.indexOf(msg) !== -1)
        return;
    deprecatedMessages.push(msg);
    console.error("[mobservable] Deprecated: " + msg);
}

/**
    Makes sure that the provided function is invoked at most once.
*/
export function once(func: Lambda):Lambda {
    var invoked = false;
    return function() {
        if (invoked)
            return;
        invoked = true;
        return func.apply(this, arguments);
    }
}

export const noop = () => {};

export function unique<T>(list:T[]):T[] {
    var res = [];
    list.forEach(item => {
        if (res.indexOf(item) === -1)
            res.push(item);
    });
    return res;
}

export function isPlainObject(value) {
    return value !== null && typeof value == 'object' && Object.getPrototypeOf(value) === Object.prototype;
}

export function makeNonEnumerable(object:any, props:string[]) {
    for(var i = 0; i < props.length; i++) {
        Object.defineProperty(object, props[i], {
            configurable: true,
            writable: true,
            enumerable: false,
            value: object[props[i]]
        });
    }
}

/**
    * Naive deepEqual. Doesn't check for prototype, non-enumerable or out-of-range properties on arrays.
    * If you have such a case, you probably should use this function but something fancier :).
    */
export function deepEquals(a, b) {
    if (a === null && b === null)
        return true;
    if (a === undefined && b === undefined)
        return true;
    const aIsArray = Array.isArray(a) || a instanceof ObservableArray;
    if (aIsArray !== (Array.isArray(b) || b instanceof ObservableArray)) {
        return false;
    } else if (aIsArray) {
        if (a.length !== b.length)
            return false;
        for (var i = a.length; i >= 0; i--)
            if (!deepEquals(a[i], b[i]))
                return false;
        return true;
    } else if (typeof a === "object" && typeof b === "object") {
        if (a === null || b === null)
            return false;
        if (Object.keys(a).length !== Object.keys(b).length)
            return false;
        for(var prop in a) {
            if (!b.hasOwnProperty(prop))
                return false;
            if (!deepEquals(a[prop], b[prop]))
                return false;
        }
        return true;
    }
    return a === b;
}

/**
    * Given a new and an old list, tries to determine which items are added or removed
    * in linear time. The algorithm is heuristic and does not give the optimal results in all cases.
    * (For example, [a,b] -> [b, a] yiels [[b,a],[a,b]])
    * its basic assumptions is that the difference between base and current are a few splices.
    *
    * returns a tuple<addedItems, removedItems>
    * @type {T[]}
    */
export function quickDiff<T>(current:T[], base:T[]):[T[],T[]] {
    if (!base || !base.length)
        return [current, []];
    if (!current || !current.length)
        return [[], base];

    var added:T[] = [];
    var removed:T[] = [];

    var currentIndex = 0,
        currentSearch = 0,
        currentLength = current.length,
        currentExhausted = false,
        baseIndex = 0,
        baseSearch = 0,
        baseLength = base.length,
        isSearching = false,
        baseExhausted = false;

    while (!baseExhausted && !currentExhausted) {
        if (!isSearching) {
            // within rang and still the same
            if (currentIndex < currentLength && baseIndex < baseLength && current[currentIndex] === base[baseIndex]) {
                currentIndex++;
                baseIndex++;
                // early exit; ends where equal
                if (currentIndex === currentLength && baseIndex === baseLength)
                    return [added, removed];
                continue;
            }
            currentSearch = currentIndex;
            baseSearch = baseIndex;
            isSearching = true;
        }
        baseSearch += 1;
        currentSearch += 1;
        if (baseSearch >= baseLength)
            baseExhausted = true;
        if (currentSearch >= currentLength)
            currentExhausted = true;

        if (!currentExhausted && current[currentSearch] === base[baseIndex]) {
            // items where added
            added.push(...current.slice(currentIndex, currentSearch));
            currentIndex = currentSearch +1;
            baseIndex ++;
            isSearching = false;
        }
        else if (!baseExhausted && base[baseSearch] === current[currentIndex]) {
            // items where removed
            removed.push(...base.slice(baseIndex, baseSearch));
            baseIndex = baseSearch +1;
            currentIndex ++;
            isSearching = false;
        }
    }

    added.push(...current.slice(currentIndex));
    removed.push(...base.slice(baseIndex));
    return [added, removed];
}

import {Lambda} from '../interfaces';
import {ObservableArray} from '../types/observablearray';
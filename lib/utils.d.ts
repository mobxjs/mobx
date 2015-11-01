/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */
/**
    Makes sure that the provided function is invoked at most once.
*/
export declare function once(func: Lambda): Lambda;
export declare function unique<T>(list: T[]): T[];
export declare function isPlainObject(value: any): boolean;
export declare function makeNonEnumerable(object: any, props: string[]): void;
/**
    * Naive deepEqual. Doesn't check for prototype, non-enumerable or out-of-range properties on arrays.
    * If you have such a case, you probably should use this function but something fancier :).
    */
export declare function deepEquals(a: any, b: any): boolean;
/**
    * Given a new and an old list, tries to determine which items are added or removed
    * in linear time. The algorithm is heuristic and does not give the optimal results in all cases.
    * (For example, [a,b] -> [b, a] yiels [[b,a],[a,b]])
    * its basic assumptions is that the difference between base and current are a few splices.
    *
    * returns a tuple<addedItems, removedItems>
    * @type {T[]}
    */
export declare function quickDiff<T>(current: T[], base: T[]): [T[], T[]];
import { Lambda } from './interfaces';

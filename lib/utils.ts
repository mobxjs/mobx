/**
 * mobservable
 * (c) 2015 - Michel Weststrate
 * https://github.com/mweststrate/mobservable
 */

namespace mobservable {
    export namespace _ {
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

        export function noop(){
            // NOOP
        }

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
    }
}
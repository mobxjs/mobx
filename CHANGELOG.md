# 2.0.0

Welcome to ~Mobservable~ MobX 2! First of all, there is the name change. Secondly, migrating from Mobservable 1 should be pretty straight-forward as the public api is largely the same.
However there are some conceptual changes which justifies a Major version bump as it might alter the behavior of MobX in edge cases.
Besides that, MobX is just a large collection of minor improvements over Mobservable 1.
So enjoy!  

## `autorun`'s are now allowed to cause cycles!
`autorun` is now allowed to have cycles. In Mobservable 1 an exception was thrown as soon as an autorun modified a variable which it was reading as well.  
In MobX 2 these situations are now allowed and the autorun will trigger itself to be fired again immediately after the current execution.
This is fine as long as the autorun terminates within a reasonable amount of iterations (100).
This should avoid the need for work-arounds involving `setTimeout` etc.
Note that computed values (created using `observable(func)` are still not allowed to have cycles.

## [Breaking] `observable(primitive)` returns an object instead of a function.

Creating an observable from a primitive or a reference no longer returns a getter/setter function, but a method with a `.get` and `.set` method.
This is less confusing, easier to debug and more efficient.

So to read or write from an observable scalar use:
```javascript
const temperature =  observable(27);
temperature.set(15); // previously: temperature(15) 
temperature.get();   // previously: temperature()
```

The `.observe` method is still available on observable scalars but deprecated. Use `mobx.observe(observable, listener)` instead.
Note that often `.autorun` is a more powerful alternative to `.observe`.

## MobX is now extensible!

The core algorithm of MobX has been largely rewritten to improve the clarity, extensibility, performance and stability of the source code.
It is now possible to define your own custom observable data sources by using the `Atom` class.
It is also possible to create your own reactive functinos using the `Reaction` class. `autorun`, `autorunAsync` and `@observer` have now all been implemented using the concept of Reactions.
So feel free to write your own reactive constructions!
(both [Atom](https://github.com/mobx/mobservable/blob/master/src/core/atom.ts) and [Reaction](https://github.com/mobx/mobservable/blob/master/src/core/reaction.ts) will be documented in more detail soon, but the source code should already be pretty self explanatory).

## Mobservable now fails fast

In Mobservable 1 exceptions would be caught and sometimes rethrown after logging them.
This was confusing and not all derivations were able to recover from these exceptions.
In MobX 2 it is no longer allowed for a computed function or autorun to throw an exception. 

## Improved build

* MobX is roughly 20% faster
* MobX is smaller: 75KB -> 60KB unminified, and 54KB -> 30KB minified.
* Distributable builds are no longer available in the git repository, use npmcdn instead:
* Commonjs build: https://npmcdn.com/mobx@^2.0.0/lib/mobx.js
* Minified commonjs build: https://npmcdn.com/mobx@^2.0.0/lib/mobx.min.js
* UMD build: https://npmcdn.com/mobx@^2.0.0/lib/mobx.umd.js
* To use the minified build, require / import the lib from `"mobx/lib/mobx.min.js"` (or set up an alias in your webpack configuration if applicable)

## Other changes

* Improved debug names of all observables. This is especially visible when using `mobx-react-devtools` or `extras.trackTransitions`.
* Renamed `extras.SimpleEventEmitter` to `SimpleEventEmitter`
* Removed already deprecated methods: `isReactive`, `makeReactive`, `observeUntil`, `observeAsync`
* Removed `extras.getDNode`
* invoking `ObservableArray.peek` is no longer registered as listener
* Deprecated `untracked`. It wasn't documented and nobody seems to miss it.
* @computed
* @computed({ asStructure: boolean })
* @computed properties are no longer enumerable by default
* Deprecated `observable(scalar)`


# 1.2.4

* Fixed: observable arrays didn't properly apply modifiers if created using `asFlat([])` or `fastArray([])`
* Don't try to make frozen objects observable (by @andykog)
* `observableArray.reverse` no longer mutates the arry but just returns a sorted copy
* Updated tests to use babel6

# 1.2.3

* observableArray.sort no longer mutates the array being sorted but returns a sorted clone instead (#90)
* removed an incorrect internal state assumption (#97)

# 1.2.2

* Add bower support

# 1.2.1

* Computed value now yields consistent results when being inspected while in transaction

# 1.2.0

* Implemented #67: Reactive graph transformations. See: http://mobxjs.github.io/mobservable/refguide/create-transformer.html

# 1.1.8

* Implemented #59, `isObservable` and `observe` now support a property name as second param to observe individual values on maps and objects.

# 1.1.7

* Fixed #77: package consumers with --noImplicitAny should be able to build

# 1.1.6

* Introduced `mobservable.fastArray(array)`, in addition to `mobservable.observable(array)`. Which is much faster when adding items but doesn't support enumerability (`for (var idx in ar) ..` loops).
* Introduced `observableArray.peek()`, for fast access to the array values. Should be used read-only.

# 1.1.5

* Fixed 71: transactions should not influence running computations

# 1.1.4

* Fixed #65; illegal state exception when using a transaction inside a reactive function. Credits: @kmalakoff

# 1.1.3

* Fixed #61; if autorun was created during a transaction, postpone execution until the end of the transaction

# 1.1.2

* Fixed exception when autorunUntil finished immediately

# 1.1.1

* `toJSON` now serializes object trees with cycles as well. If you know the object tree is acyclic, pass in `false` as second parameter for a performance gain. 

# 1.1.0

* Exposed `ObservableMap` type
* Introduced `mobservable.untracked(block)`
* Introduced `mobservable.autorunAsync(block, delay)`

# 1.0.9

Removed accidental log message

# 1.0.7 / 1.0.8

Fixed inconsistency when using `transaction` and `@observer`, which sometimes caused stale values to be displayed.

# 1.0.6

Fix incompatibility issue with systemjs bundler (see PR 52)

# 1.0.4/5

* `map.size` is now a property instead of a function
* `map()` now accepts an array as entries to construct the new map
* introduced `isObservableObject`, `isObservableArray` and `isObservableMap`
* introduced `observe`, to observe observable arrays, objects and maps, similarly to Object.observe and Array.observe

# 1.0.3

* `extendObservable` now supports passing in multiple object properties

# 1.0.2

* added `mobservable.map()`, which creates a new map similarly to ES6 maps, yet observable. Until properly documentation, see the [MDN docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map).

# 1.0.1

* Stricter argument checking for several api's.

# 1.0

## Renames

* `isReactive` -> `isObservable`
* `makeReactive` -> `observable`
* `extendReactive` -> `extendObservable`
* `observe` -> `autorun`
* `observeUntil` -> `autorunUntil`
* `observeAsync` -> `autorunAsync` 
* `reactiveComponent` -> `observer` (in `mobservable-react` package)

## Breaking changes

* dropped the `strict` and `logLevel` settings of mobservable. View functions are by default run in `strict` mode, `autorun` (formerly: `observe`) functions in `non-strict` mode (strict indicates that it is allowed to change other observable values during the computation of a view funtion). 
Use `extras.withStrict(boolean, block)` if you want to deviate from the default behavior.
* `observable` (formerly `makeReactive`) no longer accepts an options object. The modifiers `asReference`, `asStructure` and `asFlat` can be used instead.
* dropped the `default` export of observable
* Removed all earlier deprecated functions

## Bugfixes / improvements

* `mobservable` now ships with TypeScript 1.6 compliant module typings, no external typings file is required anymore.
* `mobservable-react` supports React Native as well through the import `"mobservable-react/native"`.
* Improved debugger support
* `for (var key in observablearray)` now lists the correct keys
* `@observable` now works correct on classes that are transpiled by either TypeScript or Babel (Not all constructions where supported in Babel earlier)
* Simplified error handling, mobservable will no longer catch errors in views, which makes the stack traces easier to debug. 
* Removed the initial 'welcom to mobservable' logline that was printed during start-up.

# 0.7.1

* Backported Babel support for the @observable decorator from the 1.0 branch. The decorator should now behave the same when compiled with either Typescript or Babeljs. 

# 0.7.0

* Introduced `strict` mode (see issues [#30](), [#31]())
* Renamed `sideEffect` to `observe`
* Renamed `when` to `observeUntil`
* Introduced `observeAsync`.
* Fixed issue where changing the `logLevel` was not picked up.
* Improved typings.
* Introduces `asStructure` (see [#8]()) and `asFlat`. 
* Assigning a plain object to a reactive structure no longer clones the object, instead, the original object is decorated. (Arrays are still cloned due to Javascript limitations to extend arrays).
* Reintroduced `expr(func)` as shorthand for `makeReactive(func)()`, which is useful to create temporarily views inside views
* Deprecated the options object that could be passed to `makeReactive`.
* Deprecated the options object that could be passed to `makeReactive`:
  * A `thisArg` can be passed as second param.
  * A name (for debugging) can be passed as second or third param
  * The `as` modifier is no longer needed, use `asReference` (instead of `as:'reference'`) or `asFlat` (instead of `recurse:false`). 

# 0.6.10

* Fixed issue where @observable did not properly create a stand-alone view

# 0.6.9

* Fixed bug where views where sometimes not triggered again if the dependency tree changed to much.

# 0.6.8

* Introduced `when`, which, given a reactive predicate, observes it until it returns true.
* Renamed `sideEffect -> observe`

# 0.6.7:

* Improved logging

# 0.6.6:

* Deprecated observable array `.values()` and `.clone()`
* Deprecated observeUntilInvalid; use sideEffect instead
* Renamed mobservable.toJson to mobservable.toJSON

# 0.6.5:

* It is no longer possible to create impure views; views that alter other reactive values.
* Update links to the new documentation.

# 0.6.4: 

* 2nd argument of sideEffect is now the scope, instead of an options object which hadn't any useful properties

# 0.6.3

* Deprecated: reactiveComponent, reactiveComponent from the separate package mobservable-react should be used instead
* Store the trackingstack globally, so that multiple instances of mobservable can run together

# 0.6.2

* Deprecated: @observable on functions (use getter functions instead)
* Introduced: `getDependencyTree`, `getObserverTree` and `trackTransitions`
* Minor performance improvements
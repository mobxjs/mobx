# 2.4.1

* `@action` decorated methods are now configurable. Fixes #441
* The `onBecomeObserved` event handler is now triggered when an atom is observed, instead of when it is bound as dependency. Fixes #427 and makes atoms easier to extend.
* if `useStrict()` is invoked without arguments, it now returns the current value of strict mode.
* the current reaction is now always passed as first argument to the callbacks of `autorun`, `autorunAsync`, `when` and `reaction`. This allows reactions to be immediately disposed during the first run. See #438, by @andykog

# 2.4.0

* _Note: the internal version of MobX has been bumped. This version has no breaking api changes, but if you have MobX loaded multiple times in your project, they all have to be upgraded to `2.4.0`. MobX will report this when starting._
* Made dependency tracking and binding significant faster. Should result in huge performance improvements when working with large collections.
* Fixed typescript decorator issue, #423, #425? (by @bb)

# 2.3.7

* Fixed issue where computed values were tracked and accidentally kept alive during actions

# 2.3.6
* Fixed #406: Observable maps doesn't work with empty initial value in Safari
* Implemented #357, #348: ObservableMap and ObservableArray now support iterators. Use [`@@iterator()` or iterall](https://github.com/leebyron/iterall) in ES5 environments.

# 2.3.5

* Fixed #364: Observable arrays not reacting properly to index assignments under iOS safari (mobile) 9.1.1 By @andykog
* Fixed #387: Typings of boxed values
* Added warning when reading array entries out of bounds. See #381

# 2.3.4

* Fixed #360: Removed expensive cycle detection (cycles are still detected, but a bit later)
* Fixed #377: `toJS` serialization of Dates and Regexes preserves the original values
* Fixed #379: `@action` decorated methods can now be inherited / overriden

# 2.3.3

* Fixed #186: Log a warning instead of an error if an exception is thrown in a derivation. Fixes issue where React Native would produce unusable error screens (because it shows the first logged error)
* Fixed #333: Fixed some interoperability issues in combination with `Reflect` / `InversifyJS` decorators.  @andykog
* Fixed #333: `@observable` class properties are now _owned_ by their instance again, meaning they will show up in `Object.keys()` and `.hasOwnProperty` @andykog

# 2.3.2

* Fixed #328: Fixed exception when inspecting observable in `onBecomeObserved`
* Fixed #341: `array.find` now returns `undefined` instead of `null` when nothing was found, behavior now matches the docs. (By @hellectronic)

# 2.3.1

* Fixed #327: spy not working with runInAction

# 2.3.0

### Introduced `whyRun`:
Usage:
* `whyRun()`
* `whyRun(Reaction object / ComputedValue object / disposer function)`
* `whyRun(object, "computed property name")`

`whyRun` is a small utility that can be used inside computed value or reaction (`autorun`, `reaction` or the `render` method of an `observer` React component)
and prints why the derivation is currently running, and under which circumstances it will run again.
This should help to get a deeper understanding when and why MobX runs stuff, and prevent some beginner mistakes.

This feature can probably be improved based on your feedback, so feel free to file issues with suggestions!

### Semantic changes:
* `@observable` is now always defined on the class prototypes and not in the instances. This means that `@observable` properties are enumerable, but won't appear if `Object.keys` or `hasOwnProperty` is used on a class _instance_.
* Updated semantics of `reaction` as discussed in `#278`. The expression now needs to return a value and the side effect won't be triggered if the result didn't change. `asStructure` is supported in these cases. In contrast to MobX 2.2, effects will no longer be run if the output of the expression didn't change.

### Enhancements

* Introduces `isAction(fn)` #290
* If an (argumentless) action is passed to `observable` / `extendObservable`, it will not be converted into a computed property.
* Fixed #285: class instances are now also supported by `toJS`. Also members defined on prototypes which are enumerable are converted.
* Map keys are now always coerced to strings. Fixes #308
* `when`, `autorun` and `autorunAsync` now accept custom debug names (see #293, by @jamiewinder)
* Fixed #286: autorun's no longer stop working if an action throws an exception
* Implemented `runInAction`, can be used to create on the fly actions (especially useful in combination with `async/await`, see #299
* Improved performance and reduced mem usage of decorators signficantly (by defining the properties on the prototype if possible), and removed subtle differences between the implementation and behavior in babel and typescript.
* Updated logo as per #244. Tnx @osenvosem!

# 2.2.2:

* Fixed issue #267: exception when `useStrict(true)` was invoked in combination with `@observable` attributes when using Babel
* Fixed issue #269: @action in combination with typescript targeting ES6 and reflect.ts
* Improved compatibility with `JSON.stringify`, removed incorrect deprecation message
* Improved some error messages

# 2.2.1

* Fixed issue where typescript threw a compile error when using `@action` without params on a field
* Fixed issue where context was accidentally shared between class instances when using `@action` on a field

# 2.2.0

See the [release announcement](https://medium.com/@mweststrate/45cdc73c7c8d) for the full details of this release:

Introduced:
* `action` / `@action`
* `intercept`
* `spy`
* `reaction`
* `useStrict`
* improved debug names
* `toJSON` was renamed to `toJS`
* `observable(asMap())` is the new idiomatic way to create maps
* the effect of `when` is now untracked, similar to `reaction.
* `extras.trackTransations` is deprecated, use `spy` instead
* `untracked` has been undeprecated
* introduced / documented: `getAtom`, `getDebugName`, `isSpyEnabled`, `spyReport`, `spyReportStart`, `spyReportEnd`
* deprecated `extras.SimpleEventEmitter`
* array splice events now also report the `added` collection and `removedCount`

# 2.1.7

* Fixed a false negative in cycle detection, as reported in #236

# 2.1.6

* Fixed #236, #237 call stack issues when working with large arrays

# 2.1.5

* Fix #222 (by @andykog) run `observe` callback of computed properties in untracked mode.

# 2.1.4

* Fixed #201 (see also #160), another iOS enumerability issue... By @luosong

# 2.1.3

* Fixed #191, when using babel, complex field initializers where shared. By @andykog
* Added `lib/mobx.umd.min.js` for minified cdn builds, see #85

# 2.1.2

* Improved debug names of objects created using a constructor
* Fixed(?) some issues with iOS7 as reported in #60 by @bstst

# 2.1.1

* Fixed issue where `autorun`'s created inside `autorun`'s were not always kicked off. (`mobx-react`'s `observer` was not affected). Please upgrade if you often use autorun.
* Fixed typings of `mobx.map`, a list of entries is also acceptable.
* (Experimental) Improved error recovery a bit further

# 2.1.0

* MobX is now chatty again when an exception occurs inside a autorun / computed value / React.render. Previously this was considered to be the responsibility of the surrounding code. But if exceptions were eaten this would be really tricky to debug.
* (Experimental) MobX will now do a poor attempt to recover from exceptions that occured in autorun / computed value / React.render.

# 2.0.6

* `resetGlobalState` is now part of the `mobx.extras` namespace, as it is useful for test setup, to restore inconsistent state after test failures.
* `resetGlobalState` now also resets the caches of `createTransformer`, see #163.

# 2.0.5

* WIP on bower support

# 2.0.4

* `$transformId` property on transformed objects should be non-enumerable. Fixes #170.

# 2.0.3

* Always peek if inspecting a stale, computed value. Fixes #165.

# 2.0.2

* Fixed issue where changing an object property was tracked, which could lead to unending loops in `autorunAsync`.

# 2.0.1

* Undeprecated `observable(scalar)` (see 143)
* `expr` no longer prints incorrect deprecated messages (see 143)
* Requires `mobx` twice no longer fails.

# 2.0.0

## A new name...
Welcome to ~Mobservable~ MobX 2! First of all, there is the name change.
The new name is shorter and funnier and it has the right emphasis: MobX is about reactive programming.
Not about observability of data structures, which is just a technical necessity.
MobX now has its own [mobxjs](https://github.com/mobxjs) organization on GitHub. Just report an issue if you want to join.

All MobX 2.0 two compatible packages and repo's have been renamed. So `mobx-react`, `mobx-react-devtools` etc.
For the 1.0 versions, use the old `mobservable` based names.

## Migrating from Mobservable 1.x to MobX 2.0

Migrating from Mobservable should be pretty straight-forward as the public api is largely the same.
However there are some conceptual changes which justifies a Major version bump as it might alter the behavior of MobX in edge cases.
Besides that, MobX is just a large collection of minor improvements over Mobservable.
Make sure to remove your old `mobservable` dependencies when installing the new `mobx` dependencies!

## `autorun`'s are now allowed to cause cycles!
`autorun` is now allowed to have cycles. In Mobservable 1 an exception was thrown as soon as an autorun modified a variable which it was reading as well.
In MobX 2 these situations are now allowed and the autorun will trigger itself to be fired again immediately after the current execution.
This is fine as long as the autorun terminates within a reasonable amount of iterations (100).
This should avoid the need for work-arounds involving `setTimeout` etc.
Note that computed values (created using `observable(func)` are still not allowed to have cycles.

## [Breaking] `observable(scalar)` returns an object instead of a function and has been deprecated.

Creating an observable from a primitive or a reference no longer returns a getter/setter function, but a method with a `.get` and `.set` method.
This is less confusing, easier to debug and more efficient.

So to read or write from an observable scalar use:
```javascript
const temperature =  observable(27);
temperature.set(15); // previously: temperature(15)
temperature.get();   // previously: temperature()
```

`observable(scalar)` has been deprecated to make the api smaller and the syntax more uniform. In practice having observable objects, arrays and decorators seems to suffice in 99% of the cases. Deprecating this functionality means that people have simply less concepts to learn. Probably creating observable scalars will continue to work for a long time, as it is important to the internals of MobX and very convenient for testing.

## Introduced `@computed`

MobX introduced the `@computed` decorator for ES6 class properties with getter functions.
It does technically the same as `@observable` for getter properties. But having a separate decorator makes it easier to communicate about the code.
`@observable` is for mutable state properties, `@computed` is for derived values.

`@computed` can now also be parameterized. `@computed({asStructure: true})` makes sure that the result of a derivation is compared structurally instead of referentially with its preview value. This makes sure that observers of the computation don't re-evaluate if new structures are returned that are structurally equal to the original ones. This is very useful when working with point, vector or color structures for example. It behaves the same as the `asStructure` modifier for observable values.

`@computed` properties are no longer enumerable.

## MobX is now extensible!

The core algorithm of MobX has been largely rewritten to improve the clarity, extensibility, performance and stability of the source code.
It is now possible to define your own custom observable data sources by using the `Atom` class.
It is also possible to create your own reactive functions using the `Reaction` class. `autorun`, `autorunAsync` and `@observer` have now all been implemented using the concept of Reactions.
So feel free to write your own reactive [constructions](http://mobxjs.github.io/mobx/refguide/extending.html)!

## Mobservable now fails fast

In Mobservable 1 exceptions would be caught and sometimes re-thrown after logging them.
This was confusing and not all derivations were able to recover from these exceptions.
In MobX 2 it is no longer allowed for a computed function or `autorun` to throw an exception.

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
* Invoking `ObservableArray.peek` is no longer registered as listener
* Deprecated `untracked`. It wasn't documented and nobody seems to miss it.

# 1.2.5

* Map no longer throws when `.has`, `.get` or `.delete` is invoked with an invalid key (#116)
* Files are now compiled without sourcemap to avoid issues when loading mobservable in a debugger when `src/` folder is not available.

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

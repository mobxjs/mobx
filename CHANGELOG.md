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

# 0.7.0

* Introduced `strict` mode (see issues #30, #31)
* Renamed `sideEffect` to `observe`
* Renamed `when` to `observeUntil`
* Introduced `observeAsync`.
* Fixed issue where changing the `logLevel` was not picked up.
* Improved typings (will be distributed through DefinitelyTyped in the near future)
* Introduces `asStructure` (see #8) and `asFlat`. 
* Assigning a plain object to a reactive structure no longer clones the object, instead, the original object is decorated. (Arrays are still cloned due to Javascript limitations to extend arrays).
* Reintroduced `expr(func)` as shorthand for `makeReactive(func)()`, which is useful to create temporarily views inside views
* Deprecated the options object that could be passed to `makeReactive`.


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
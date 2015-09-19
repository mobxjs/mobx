
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
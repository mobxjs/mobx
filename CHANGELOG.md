# 3.4.0

* Improve Flow support support by exposing typings regularly. Flow will automatically include them now. In your `.flowconfig` will have to remove the import in the `[libs]` section (as it's done [here](https://github.com/mobxjs/mobx/pull/1254#issuecomment-348926416)). Fixes [#1232](https://github.com/mobxjs/mobx/issues/1232).

# 3.3.3

* Fixed regression bug where observable map contents could not be replaced using another observable map [#1258](https://github.com/mobxjs/mobx/issues/1258)
* Fixed weird exception abot not being able to read `length` property of a function, see[#1238](https://github.com/mobxjs/mobx/issues/1238) through [#1257](https://github.com/mobxjs/mobx/issues/1238) by @dannsam

# 3.3.2

* Fix bug where custom comparers could be invoked with `undefined` values. Fixes [#1208](https://github.com/mobxjs/mobx/issues/1208)
* Make typings for observable stricter when using flow [#1194](https://github.com/mobxjs/mobx/issues/1194), [#1231](https://github.com/mobxjs/mobx/issues/1231)
* Fix a bug where `map.replace` would trigger reactions for unchanged values, fixes [#1243](https://github.com/mobxjs/mobx/issues/1243)
* Fixed issue where `NaN` was considered unequal to `NaN` when a deep compare was made [#1249](https://github.com/mobxjs/mobx/issues/1249)

# 3.3.1

* Fix bug allowing maps to be modified outside actions when using strict mode, fixes [#940](https://github.com/mobxjs/mobx/issues/940)
* Fixed [#1139](https://github.com/mobxjs/mobx/issues/1139) properly: `transaction` is no longer deprecated and doesn't disable tracking properties anymore
* Fixed [#1120](https://github.com/mobxjs/mobx/issues/1139): `isComputed` should return false for non-existing properties

# 3.3.0

* Undeprecated `transaction`, see [#1139](https://github.com/mobxjs/mobx/issues/1139)
* Fixed typings of reaction [#1136](https://github.com/mobxjs/mobx/issues/1136)
* It is now possible to re-define a computed property [#1121](https://github.com/mobxjs/mobx/issues/1121)
* Print an helpful error message when using `@action` on a getter [#971](https://github.com/mobxjs/mobx/issues/971)
* Improved typings of intercept [#1119](https://github.com/mobxjs/mobx/issues/1119)
* Made code base Prettier [#1103](https://github.com/mobxjs/mobx/issues/1103)
* react-native will now by default use the es module build as well.
* Added support for Weex, see [#1163](https://github.com/mobxjs/mobx/pull/1163/)
* Added workaround for Firefox issue causing MobX to crash, see [#614](https://github.com/mobxjs/mobx/issues/614)

# 3.2.2

* Fixes a bug (or a known limitation) described in [#1092](https://github.com/mobxjs/mobx/issue/1092/). It is now possible to have different observable administration on different levels of the prototype chain. By @guillaumeleclerc
* Fixed a build issue when using mobx in a project that was using rollup, fixes [#1099](https://github.com/mobxjs/mobx/issue/1099/) by @rossipedia
* Fixed typings of `useStrict`, by @rickbeerendonk

# 3.2.1

* Introduced customizable value comperators to reactions and computed values. `reaction` and `computed` now support an additional option, `equals`, which takes a comparision function. See [#951](https://github.com/mobxjs/mobx/pull/951/) by @jamiewinder. Fixes #802 and #943. See the updated [`computed` docs](https://mobx.js.org/refguide/computed-decorator.html) for more details.

# 3.2.0

* MobX will warn again when there are multiple instances of MobX loaded, as this lead to often to confusing bugs if the project setup was not properly. The signal mobx that multiple instances are loaded on purpose, use `mobx.extras.runInSandbox`. See [#1082](https://github.com/mobxjs/mobx/issues/1082) for details.

# 3.1.17

* Improved typings of `IObservableArray.intercept`: use more restrictive types for `change` parameter of `handler`, by @bvanreeven
* Fixed [#1072](https://github.com/mobxjs/mobx/issues/1072), fields without a default value could not be observed yet when using TypeScript

# 3.1.16

* Restored `default` export (and added warning), which broke code that was importing mobx like `import mobx from "mobx"`. Use `import * as mobx from "mobx"` or use named importes instead. By @andykog, see #1043, #1050
* Fixed several typos in exceptions and documentation

# 3.1.15

* Fixed issue where `array.remove` did not work correctly in combination with `extras.interceptReads`

# 3.1.14

* Fixed 3.1.12 / 3.1.13 module packing. See #1039; `module` target is now transpiled to ES5 as well

# 3.1.13 (Unpublished: Uglify chokes on it in CRA)

* Fixed build issue with webpack 2, see #1040

# 3.1.12 (Unpublished: wasn't being bundled correctly by all bundlers)

* Added support for ES modules. See #1027 by @rossipedia
* Improved flow typings. See #1019 by @fb55
* Introduced experimental feature `extras.interceptReads(observable: ObservableMap | ObservableArray | ObservableObject | ObservableBox, property?: string, handler: value => value): Disposer` that can be used to intercept _reads_ from observable objects, to transform values on the fly when a value is read. One can achieve similar things with this as with proxying reads. See #1036

# 3.1.11

* Using rollup as bundler, instead of custom hacked build scripts, by @rossipedia, see #1023

# 3.1.10

* Fixed flow typings for `when`, by @jamsea
* Add flow typings for `map.replace`, by @leader22
* Added `observableArray.findIndex`, by @leader22
* Improved typings of `autorun` / `autorunAsync` to better support async / await, by @capaj
* Fixed typings of `action.bound`, see #803

# 3.1.9

* Introduced explicit `.get(index)` and `.set(index, value)` methods on observable arrays, for issues that have trouble handling many property descriptors on objects. See also #734
* Made sure it is safe to call `onBecomeObserved` twice in row, fixes #874, #898
* Fixed typings of `IReactionDisposer`

# 3.1.8

* Fixed edge case where `autorun` was not triggered again if a computed value was invalidated by the reaction itself, see [#916](https://github.com/mobxjs/mobx/issues/916), by @andykog
* Added support for primtive keys in `createTransformer`, See #920 by @dnakov
* Improved typings of `isArrayLike`, see #904, by @mohsen1

# 3.1.7

* Reverted ES2015 module changes, as they broke with webpack 2 (will be re-released later)

# 3.1.6 (Unpublished)

* Expose ES2015 modules to be used with advanced bundlers, by @mohsen1, fixes #868
* Improved typings of `IObservableArray.intercept`: remove superflous type parameter, by @bvanreeven
* Improved typings of map changes, by @hediet

# 3.1.5

* Improved typings of map changes, see #847, by @hediet
* Fixed issue with `reaction` if `fireImmediately` was combined with `delay` option, see #837, by @SaboteurSpk

# 3.1.4

* Observable maps initialized from ES6 didn't deeply convert their values to observables. (fixes #869,by @ggarek)

# 3.1.3

* Make sure that `ObservableArray.replace` can handle large arrays by not using splats internally. (See e.g. #859)
* Exposed `ObservableArray.spliceWithArray`, that unlike a normal splice, doesn't use a variadic argument list so that it is possible to splice in new arrays that are larger then allowed by the callstack.

# 3.1.2

* Fixed incompatiblity issue with `mobx-react@4.1.0`

# 3.1.1 (unpublished)

* Introduced `isBoxedObservable(value)`, fixes #804

# 3.1.0

### Improved strict mode

Strict mode has been relaxed a bit in this release. Also computed values can now better handle creating new observables (in an action if needed). The semantics are now as follows:

* In strict mode, it is not allowed to modify state that is already being _observed_ by some reaction.
* It is allowed to create and modify observable values in computed blocks, as long as they are not _observed_ yet.

In order words: Observables that are not in use anywhere yet, are not protected by MobX strict mode.
This is fine as the main goal of strict mode is to avoid kicking of reactions at undesired places.
Also strict mode enforces batched mutations of observables (through action).
However, for unobserved observables this is not relevant; they won't kick of reactions at all.

This fixes some uses cases where one now have to jump through hoops like:
* Creating observables in computed properties was fine already, but threw if this was done with the aid of an action. See issue [#798](https://github.com/mobxjs/mobx/issues/798).
* In strict mode, it was not possible to _update_ observable values without wrapping the code in `runInAction` or `action`. See issue [#563](https://github.com/mobxjs/mobx/issues/563)

Note that the following constructions are still anti patterns, although MobX won't throw anymore on them:
* Changing unobserved, but not just created observables in a computed value
* Invoke actions in computed values. Use reactions like `autorun` or `reaction` instead.

Note that observables that are not in use by a reaction, but that have `.observe` listeners attached, do *not* count towards being observed.
Observe and intercept callbacks are concepts that do not relate to strict mode, actions or transactions.

### Other changes

* Reactions and observable values now consider `NaN === NaN`, See #805 by @andykog
* Merged #783: extract error messages to seperate file, so that they can be optimized in production builds (not yet done), by @reisel, #GoodnessSquad
* Improved typings of actions, see #796 by @mattiamanzati

# 3.0.2

* Fixed issue where MobX failed on environments where `Map` is not defined, #779 by @dirtyrolf
* MobX can now be compiled on windows as well! #772 by @madarauchiha #GoodnessSquad
* Added documentation on how Flow typings can be used, #766 by @wietsevenema
* Added support for `Symbol.toPrimitive()` and `valueOf()`, see #773 by @eladnava #GoodnessSquad
* Supressed an exception that was thrown when using the Chrome Developer tools to inspect arrays, see #752

Re-introduced _structural comparison_. Seems we couldn't part from it yet :). So the following things have been added:

* `struct` option to `reaction` (alias for `compareStructural`, to get more consistency in naming)
* `observable.struct`, as alias for `observable.deep.struct`
* `observable.deep.struct`: Only stores a new value and notify observers if the new value is not structurally the same as the previous value. Beware of cycles! Converts new values automatically to observables (like `observable.deep`)
* `observable.ref.struct`: Only stores a new value and notify observers if the new value is not structurally the same as the previous value. Beware of cycles! Doesn't convert the new value into observables.
* `extras.deepEquals`: Check if two data structures are deeply equal. supports observable and non observable data structures.

# 3.0.1

* `toString()` of observable arrays now behaves like normal arrays (by @capaj, see #759)
* Improved flow types of `toJS`by @jamsea (#758)

# 3.0.0

The changelog of MobX 3 might look quite overwhelming, but migrating to MobX 3 should be pretty straight forward nonetheless.
The api has now become more layered, and the api is more uniform and modifiers are cleaned up.
In practice, you should check your usage of modifiers (`asFlat`, `asMap` etc.). Besides that the migration should be pretty painless.
Please report if this isn't the case!
Note that no changes to the runtime algorithm where made, almost all changes evolve in making the creation of observables more uniform, and removing deprecated stuff.

## `observable` api has been redesigned

The api to create observables has been redesigned.
By default, it keeps the automatic conversion behavior from MobX 2.
However, one can now have more fine grained control on how  / which observables are constructed.
Modifiers still exists, but they are more regular, and there should be less need for them.

### `observable(plainObject)` will no longer enhance objects, but clone instead

When passing a plain object to `observable`, MobX used to modify that object inplace and give it observable capabilities.
This also happened when assigning a plain object to an observable array etc.
However, this behavior has changed for a few reasons

1.  Both arrays and maps create new data structure, however, `observable(object)` didn't
2.  It resulted in unnecessary and confusing side effects. If you passed an object you received from some api to a function that added it, for example, to an observable collection. Suddenly your object would be modified as side effect of passing it down to that function. This was often confusing for beginners and could lead to subtle bugs.
3.  If MobX in the future uses Proxies behind the scenes, this would need to change as well

If you want, you can still enhance existing plainObjects, but simply using `extendObservable(data, data)`. This was actually the old implementation, which has now changed to `extendObservable({}, data)`.

As always, it is best practice not to have transportation objects etc lingering around; there should be only one source of truth, and that is the data that is in your observable state.
If you already adhered to this rule, this change won't impact you.

See [#649](https://github.com/mobxjs/mobx/issues/649)

### Factories per observable type

There are now explicit methods to create an observable of a specific type.

* `observable.object(props, name?)` creates a new observable object, by cloning the give props and making them observable
* `observable.array(initialValues, name?)`. Take a guess..
* `observable.map(initialValues, name?)`
* `observable.box(initialValue, name?)`. Creates a [boxed](http://mobxjs.github.io/mobx/refguide/boxed.html) value, which can be read from / written to using `.get()` and `.set(newValue)`
* `observable(value)`, as-is, based on the type of `value`, uses any of the above four functions to create a new observable.

### Shallow factories per type

The standard observable factories create observable structures that will try to turn any plain javascript value (arrays, objects or Maps) into observables.
Allthough this is fine in most cases, in some cases you might want to disable this autoconversion.
For example when storing objects from external libraries.
In MobX 2 you needed to use `asFlat` or `asReference` modifiers for this.
In MobX 3, there are factories to directly create non-converting data structures:

* `observable.shallowObject(props, name?)`
* `observable.shallowArray(initialValues, name?)`
* `observable.shallowMap(initialValues, name?)`
* `observable.shallowBox(initialValue, name?)`

So for example, `observable.shallowArray([todo1, todo2])` will create an observable array, but it won't try to convert the todos inside the array into observables as well.

### Shallow properties

The `@observable` decorator can still be used to introduce observable properties. And like in MobX 2, it will automatically convert its values.

However, sometimes you want to create an observable property that does not convert its _value_ into an observable automatically.
Previously that could be written as `@observable x = asReference(value)`.

### Structurally comparison of observables have been removed

This was not for a technical reason, but they just seemed hardly used.
Structural comparision for computed properties and reactions is still possible.
Feel free to file an issue, including use case, to re-introduce this feature if you think you really need it.
However, we noticed that in practice people rarely use it. And in cases where it is used `reference` / `shallow` is often a better fit (when using immutable data for example).

### Modifiers

Modifiers can be used in combination `@observable`, `extendObservable` and `observable.object` to change the autoconversion rules of specific properties.

The following modifiers are available:

* `observable.deep`: This is the default modifier, used by any observable. It converts any assigned, non-primitive value into an observable value if it isn't one yet.
* `observable.ref`: Disables automatic observable conversion, just creates an observable reference instead.
* `observable.shallow`: Can only used in combination with collections. Turns any assigned collection into an collection, which is shallowly observable (instead of deep)

Modifiers can be used as decorator:

```javascript
class TaskStore {
    @observable.shallow tasks = []
}
```

Or as property modifier in combination with `observable.object` / `observable.extendObservable`.
Note that modifiers always 'stick' to the property. So they will remain in effect even if a new value is assigned.

```javascript
const taskStore = observable({
    tasks: observable.shallow([])
})
```

See [modifiers](http://mobxjs.github.io/mobx/refguide/modifiers.html)

### `computed` api has been simplified

Using `computed` to create boxed observables has been simplified, and `computed` can now be invoked as follows:
* `computed(expr)`
* `computed(expr, setter)`
* `computed(expr, options)`, where options is an object that can specify one or more of the following fields: `name`, `setter`, `compareStructural` or `context` (the "this").

Computed can also be used as a decorator:

* `@computed`
* `@computed.struct` when you want to compareStructural (previously was `@computed({asStructure: true})`)

### `reaction` api has been simplified

The signature of `reaction` is now `reaction(dataFunc, effectFunc, options?)`, where the following options are accepted:

* `context`: The `this` to be used in the functions
* `fireImmediately`
* `delay`: Number in milliseconds that can be used to debounce the effect function.
* `compareStructural`: `false` by default. If `true`, the return value of the *data* function is structurally compared to its previous return value, and the *effect* function will only be invoked if there is a structural change in the output.
* `name`: String

### Bound actions

It is now possible to create actions and bind them in one go using `action.bound`. See [#699](https://github.com/mobxjs/mobx/issues/699).
This means that now the following is possible:

```javascript
class Ticker {
	@observable tick = 0

	@action.bound
	increment() {
		this.tick++ // 'this' will always be correct
	}
}

const ticker = new Ticker()
setInterval(ticker.increment, 1000)
```

### Improve error handling

Error handling in MobX has been made more consistent. In MobX 2 there was a best-effort recovery attempt if a derivation throws, but MobX 3 introduced
more consistent behavior:

* Computed values that throw, store the exception and throw it to the next consumer(s). They keep tracking their data, so they are able to recover from exceptions in next re-runs.
* Reactions (like `autorun`, `when`, `reaction`, `render()`  of `observer` components) will always catch their exceptions, and just log the error. They will keep tracking their data, so they are able to recover in next re-runs.
* The disposer of a reaction exposes an `onError(handler)` method, which makes it possible to attach custom error handling logic to an reaction (that overrides the default logging behavior).
* `extras.onReactionError(handler)` can be used to register a global onError handler for reactions (will fire after spy "error" event). This can be useful in tests etc.

See [#731](https://github.com/mobxjs/mobx/issues/731)

### Removed error handling, improved error recovery

MobX always printed a warning when an exception was thrown from a computed value, reaction or react component: `[mobx] An uncaught exception occurred while calculating....`.
This warning was often confusing for people because they either had the impression that this was a mobx exception, while it actually is just informing about an exception that happened in userland code.
And sometimes, the actual exception was silently caught somewhere else.
MobX now does not print any warnings anymore, and just makes sure its internal state is still stable.
Not throwing or handling an exception is now entirely the responsibility of the user.

Throwing an exception doesn't revert the causing mutation, but it does reset tracking information, which makes it possible to recover from exceptions by changing the state in such a way that a next run of the derivation doesn't throw.

### Flow-Types Support 🎉🎉🎉

Flow typings have been added by [A-gambit](https://github.com/A-gambit).
Add flow types for methods and interfaces of observable variables:

```js
const observableValue: IObservableValue<number> = observable(1)
const observableArray: IObservableArray<number> = observable([1,2,3])

const sum: IComputedValue<number> = computed(() => {
	return observableArray.reduce((a: number, b: number): number => a + b, 0)
})
```

See [#640](https://github.com/mobxjs/mobx/issues/640)

### MobX will no longer share global state by default

For historical reasons (at Mendix), MobX had a feature that it would warn if different versions of the MobX package are being loaded into the same javascript runtime multiple times.
This is because multiple instances by default try to share their state.
This allows reactions from one package to react to observables created by another package,
even when both packages where shipped with their own (embedded) version of MobX (!).

Obviously this is a nasty default as it breaks package isolation and might actually start to throw errors unintentionally when MobX is loaded multiple times in the same runtime by completely unrelated packages.
So this sharing behavior is now by default turned off.
Sharing MobX should be achieved by means of proper bundling, de-duplication of packages or using peer dependencies / externals if needed.
This is similar to packages like React, which will also bail out if you try to load it multiple times.

If you still want to use the old behavior, this can be achieved by running `mobx.extras.shareGlobalState()` on _all_ packages that want to share state with each other.
Since this behavior is probably not used outside Mendix, it has been deprecated immediately, so if you rely on this feature, please report in #621, so that it can be undeprecated if there is no more elegant solution.

See [#621](https://github.com/mobxjs/mobx/issues/621)

### Other changes

* **Breaking change:** The arguments to `observe` listeners for computed and boxed observables have changed and are now consistent with the other apis. Instead of invoking the callback with `(newValue: T, oldValue: T)` they are now invoked with a single change object: `(change: {newValue: T, oldValue: T, object, type: "update"})`
* Using transaction is now deprecated, use `action` or `runInAction` instead. Transactions now will enter an `untracked` block as well, just as actions, which removes the conceptual difference.
* Upgraded to typescript 2
* It is now possible to pass ES6 Maps to `observable` / observable maps. The map will be converted to an observable map (if keys are string like)
* Made `action` more debug friendly, it should now be easier to step through
* ObservableMap now has an additional method, `.replace(data)`, which is a combination of `clear()` and `merge(data)`.
* Passing a function to `observable` will now create a boxed observable refering to that function
* Fixed #603: exceptions in transaction breaks future reactions
* Fixed #698: createTransformer should support default arguments
* Transactions are no longer reported grouped in spy events. If you want to group events, use actions instead.
* Normalized `spy` events further. Computed values and actions now report `object` instead of `target` for the scope they have been applied to.
* The following deprecated methods have been removed:
  * `transaction`
  * `autorunUntil`
  * `trackTransitions`
  * `fastArray`
  * `SimpleEventEmitter`
  * `ObservableMap.toJs` (use `toJS`)
  * `toJSlegacy`
  * `toJSON` (use `toJS`)
  * invoking `observe` and `inject` with plain javascript objects

---

# 2.7.0

### Automatic inference of computed properties has been deprecated.

A deprecation message will now be printed if creating computed properties while relying on automatical inferrence of argumentless functions as computed values. In other words, when using `observable` or `extendObservable` in the following manner:

```javascript
const x = observable({
	computedProp: function() {
		return someComputation
	}
})

// Due to automatic inferrence now available as computed property:
x.computedProp
// And not !
x.computedProp()
```

Instead, to create a computed property, use:

```javascript
observable({
	get computedProp() {
		return someComputation
	}
})
```

or alternatively:

```javascript
observable({
	computedProp: computed(function() {
		return someComputation
	})
})
```

This change should avoid confusing experiences when trying to create methods that don't take arguments.
The current behavior will be kept as-is in the MobX 2.* range,
but from MobX 3 onward the argumentless functions will no longer be turned
automatically into computed values; they will be treated the same as function with arguments.
An observable _reference_ to the function will be made and the function itself will be preserved.
See for more details [#532](https://github.com/mobxjs/mobx/issues/532)

N.B. If you want to introduce actions on an observable that modify its state, using `action` is still the recommended approach:

```javascript
observable({
	counter: 0,
	increment: action(function() {
		this.counter++
	})
})
```

### Misc

* Fixed #701: `toJS` sometimes failing to convert objects decorated with `@observable` (cause: `isObservable` sometimes returned false on these object)
* Fixed typings for `when` / `autorun` / `reaction`; they all return a disposer function.


# 2.6.5

* Added `move` operation to observable array, see [#697](https://github.com/mobxjs/mobx/pull/697)

# 2.6.4

* Fixed potential clean up issue if an exception was thrown from an intercept handler
* Improved typings of `asStructure` (by @nidu, see #687)
* Added support for `computed(asStructure(() => expr))` (by @yotambarzilay, see #685)

# 2.6.3

* Fixed #603: exceptions in transaction breaks future reactions
* Improved typings of `toJS`
* Introduced `setReactionScheduler`. Internal api used by mobx-react@4 to be notified when reactions will be run

# 2.6.2

* Changes related to `toJS` as mentioned in version `2.6.0` where not actually shipped. This has been fixed, so see release notes below.

# 2.6.1

* Introduced convenience `isArrayLike`: returns whether the argument is either a JS- or observable array. By @dslmeinte
* Improved readme. By @DavidLGoldberg
* Improved assertion message, by @ncammarate (See [#618](https://github.com/mobxjs/mobx/pull/618))
* Added HashNode badge, by @sandeeppanda92

# 2.6.0

_Marked as minor release as the behavior of `toJS` has been changed, which might be interpreted both as bug-fix or as breaking change, depending of how you interpreted the docs_

* Fixed [#566](https://github.com/mobxjs/mobx/pull/566): Fixed incorrect behavior of `toJS`: `toJS` will now only recurse into observable object, not all objects. The new behavior is now aligned with what is suggested in the docs, but as a result the semantics changed a bit. `toJSlegacy` will be around for a while implementing the old behavior. See [#589](See https://github.com/mobxjs/mobx/pull/589) for more details.
* Fixed [#571](https://github.com/mobxjs/mobx/pull/571): Don't use `instanceof` operator. Should fix issues if MobX is included multiple times in the same bundle.
* Fixed [#576](https://github.com/mobxjs/mobx/pull/576): disallow passing actions directly to `autorun`; as they won't be tracked by @jeffijoe
* Extending observable objects with other observable (objects) is now explicitly forbidden, fixes [#540](https://github.com/mobxjs/mobx/pull/540).

# 2.5.2

* Introduced `isComputed`
* Observable objects can now have a type: `IObservableObject`, see [#484](https://github.com/mobxjs/mobx/pull/484) by @spiffytech
* Restored 2.4 behavior of boxed observables inside observable objects, see [#558](https://github.com/mobxjs/mobx/issues/558)

# 2.5.1

* Computed properties can now be created by using getter / setter functions. This is the idiomatic way to introduce computed properties from now on:

```javascript
const box = observable({
	length: 2,
	get squared() {
		return this.length * this.length
	},
	set squared(value) {
		this.length = Math.sqrt(value)
	}
})
```

# 2.5.0

* Core derivation algorithm has received some majore improvements by @asterius1! See below. Pr #452, 489
* Introduced setters for computed properties, use `computed(expr, setter)` or `@computed get name() { return expr } set name (value) { action }`. `computed` can now be used as modifier in `observable` / `extendObservable`, #421, #463 (see below for example)
* Introduced `isStrictModeEnabled()`, deprecated `useStrict()` without arguments, see #464
* Fixed #505, accessing an observable property throws before it is initialized

MobX is now able track and memoize computed values while an (trans)action is running.
Before 2.5, accessing a computed value during a transaction always resulted in a recomputation each time the computed value was accessed, because one of the upstream observables (might) have changed.
In 2.5, MobX actively tracks whether one of the observables has changed and won't recompute computed values unnecessary.
This means that computed values are now always memoized for the duration of the current action.
In specific cases, this might signficantly speed up actions that extensively make decisions based on computed values.

Example:
```javascript
class Square {
	@observable length = 2
	@computed get squared() {
		return this.length * this.length
	}
	// mobx now supports setters for computed values
	set squared(surfaceSize) {
		this.length = Math.sqrt(surfaceSize)
	}

	// core changes make actions more efficient if extensively using computed values:
	@action stuff() {
		this.length = 3
		console.log(this.squared) // recomputes in both 2.5 and before
		console.log(this.squared) // no longer recomputes
		this.length = 4
		console.log(this.squared) // recomputes in both 2.5 and before
		// after the action, before 2.5 squared would compute another time (if in use by a reaction), that is no longer the case
	}
}
```

ES5 example for setters:
```javascript
function Square() {
	extendObservable(this, {
		length: 2,
		squared: computed(
			function() {
				return this.squared * this.squared
			},
			function(surfaceSize) {
				this.length = Math.sqrt(surfaceSize)
			}
		)
	})
}
```

# 2.4.4

* Fixed #503: map.delete returns boolean
* Fix return type of `runInAction`, #499 by @Strate
* Fixed enumerability of observable array methods, see #496.
* Use TypeScript typeguards, #487 by @Strate
* Added overloads to `action` for better type inference, #500 by @Strate
* Fixed #502: `extendObservable` fails on objects created with `Object.create(null)`
* Implemented #480 / #488: better typings for `asMap`, by @Strate

# 2.4.3

* Objects with a `null` prototype are now considered plain objects as well
* Improved error message for non-converging cyclic reactions
* Fixed potential HMR issue

# 2.4.2

* Improved error message when wrongly using `@computed`, by @bb (#450)
* `observableArray.slice` now automatically converts observable arrays to plain arrays, fixes #460
* Improved error message when an uncaught exception is thrown by a MobX tracked function

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
* Fixed #286: autoruns no longer stop working if an action throws an exception
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

* Fixed issue where `autorun`s created inside `autorun`s were not always kicked off. (`mobx-react`'s `observer` was not affected). Please upgrade if you often use autorun.
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

All MobX 2.0 two compatible packages and repos have been renamed. So `mobx-react`, `mobx-react-devtools` etc.
For the 1.0 versions, use the old `mobservable` based names.

## Migrating from Mobservable 1.x to MobX 2.0

Migrating from Mobservable should be pretty straight-forward as the public api is largely the same.
However there are some conceptual changes which justifies a Major version bump as it might alter the behavior of MobX in edge cases.
Besides that, MobX is just a large collection of minor improvements over Mobservable.
Make sure to remove your old `mobservable` dependencies when installing the new `mobx` dependencies!

## `autorun`s are now allowed to cause cycles!
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
* Distributable builds are no longer available in the git repository, use unpkg instead:
* Commonjs build: https://unpkg.com/mobx@^2.0.0/lib/mobx.js
* Minified commonjs build: https://unpkg.com/mobx@^2.0.0/lib/mobx.min.js
* UMD build: https://unpkg.com/mobx@^2.0.0/lib/mobx.umd.js
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

* Stricter argument checking for several apis.

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

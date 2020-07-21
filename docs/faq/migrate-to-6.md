---
sidebar_label: Migrating to MobX 6 [🚀]
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

MobX 6 is quite different from MobX 5. This pages covers a migration guide from MobX 4 and 5 to 6, and an extensive list of all the changes.

# Migrating to MobX 6

on latest MobX 4 / 5

From 4: set useProxies: "never"

With or without proxies

No loose fields + TS option)

        ["@babel/plugin-proposal-class-properties", { "loose": false }]

TS
"useDefineForClassFields": true

## Upgrading your code with the `mobx-undecorate` codemod

If you are an existing MobX user you have code that uses a lot of decorators, or the equivalent calls to `decorate`.

The [`mobx-undecorate`](https://www.npmjs.com/package/mobx-undecorate) package provides a codemod that can automatically update your code to be conformant to MobX 6. There is no need to install it; instead you download and execute it using the [`npx`](https://www.npmjs.com/package/npx) tool which you do need to install if you haven't already.

To get rid of all uses of MobX decorators and replace them with the equivalent `makeObservable` calls, go to the directory that contains your source code and run:

```shell
npx mobx-undecorate
```

MobX will continue to support decorators -- so if you want to retain them
and only introduce `makeObservable(this)` where required, you can use the `--keepDecorators` option:

```shell
npx mobx-undecorate --keepDecorators
```

### limitations of `mobx-undecorate`

The `mobx-undecorate` command has to introduce a constructor in classes that do not yet have one. If base class of the constructor expects arguments, the codemod cannot introduce these arguments for the subclass being upgraded, and the `super` call won't pass them either. You have to fix these manually.

`mobx-undecorate` outputs warnings for these cases when it's run.

We do have a special case for React class components to do the right thing and
pass along `props` to the superclass.

# Changelog

## New feature

makeObservable

makeAutoObservable

autoActions

-   `observable.array` now supports `{ proxy: false }` as option.

-   Fixed #2326
-   Fixed #2379

## Breaking changes

### Changes that might affect you

-   The `decorate` API has been removed, and need to be replaced by `makeObservable` in the constructor of the targeted class. It accepts the same arguments. The `mobx-undecorate` can transform this automatically.
-   When using `extendObservable` / `observable`, fields that contained functions used to be turned into observables. This is no longer the case, they will be converted into autoActions.
-   [Strict mode](../refguide/configure.md#enforceActions) for actions is now enabled by default in `observabed` mode.
-   `toJS` no longer takes any options. It no longer converts Maps and Sets to plain data structures. Generic, flexible serialization of data structures is out of scope for the MobX project, and writing custom serialization methods are a much more scalable approach to serialization. (Tip: leverage `computed`s to define how class instances should be serialized).
-   The methods `intercept` and `observe` are no longer exposed on observable arrays and maps and boxed observables. Import them as utility from mobx instead: `import { observe, intercept } from "mobx"`, and pass the collection as first argument: `observer(collection, callback)`. Note that we still recommend to avoid those API's.
-   `observableMap.toPOJO()`, `observableMap.toJS()` have been dropped. use `new Map(observableMap)` instead if you want to convert an observable map to to a plain Map shallowly.
-   `observableMap.toJSON()` now returns an entries array rather than a new Map, to better support serialization.
-   `observableSet.toJS()` has been dropped. use `new Set(observableSet)` instead if you want to convert an observable set to to a plain Set shallowly.
-   `observableMap.toJSON()` now returns an array rather than a new Set, to better support serialization.
-   Breaking: sorting or reversing an observableArray in an derivation (without slicing first) will now throw rather than warn. In contrast, it is now allowed to sort or reverse observable arrays in-place, as long as it happens in an action.

### Obscure things that don't work anymore, but that probably won't affect you

-   It is no longer possible to re-decorate a field (through either `@observable` or `makeObservable`) that is already declared in a super class.
-   `runInAction` no longer supports passing a name as first argument. Name the original function or use `action(name, fn)()` if you cared about the debug name.
-   `computed(getterFn, setterFn)` no longer accepts a setter function anymore as second argument. Use the `set` option instead: `computed(getterFn, { set: setterFn })`.
-   In observable arrays, for `findIndex` / `find` method, the `offset` argument (the third one) is no longer supported, to be consistent with ES arrays.
-   The option `computedConfigurable` of `configure` is no longer supported as it is now the default.
-   `observableArray.toJS()` has been removed, use `observableArray.slice()` instead, which does the same.
-   Killed support for the `IGNORE_MOBX_MINIFY_WARNING` environment flag.
-   `_allowStateChangesInComputation(fn)` is no longer needed, us `runInAction(fn)` instead.
-   In `computed`, the when `predicate` (first arg), and `reaction` predicate (first arg) it is now forbidden to directly change state. State changes should be done in their effect functinos, or otherwise wrapped in `runInAction` at least (only the state change, not the observables you want to track!) (note that this is still an anti pattern).
-   The `observableArray.get()` and `observableArray.set()` methods are no longer supported.
-   The `IObservableObject` interface is no longer exported from MobX.

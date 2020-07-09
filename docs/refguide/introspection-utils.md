---
title: Introspection APIs
sidebar_label: Introspection APIs
hide_title: true
---

# Introspection APIs

The following APIs might come in handy if you want to inspect the internal state of MobX while debugging, or want to build cool tools on top of MobX.
Also relevant are [`toJS`](tojson.md) and the various [`isObservable*` APIs](api.md#isobservable).

### `getDebugName`

Usage:

-   `getDebugName(thing, property?)`

Returns a (generated) friendly debug name of an observable object, property, reaction etc. Used by for example the [MobX developer tools](https://github.com/mobxjs/mobx-devtools).

### `getDependencyTree`

Usage:

-   `getDependencyTree(thing, property?)`.

Returns a tree structure with all observables the given reaction / computation currently depends upon.

### `getObserverTree`

Usage:

-   `getObserverTree(thing, property?)`.

Returns a tree structure with all reactions / computations that are observing the given observable.

### `getAtom`

[⚛️] Usage:

-   `getAtom(thing, property?)`.

Returns the backing _Atom_ of a given observable object, property, reaction etc.

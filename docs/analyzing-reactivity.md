---
title: Analyzing reactivity
sidebar_label: Analyzing reactivity {🚀}
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Analyzing reactivity {🚀}

# Introspection APIs

The following APIs might come in handy if you want to inspect the internal state of MobX while debugging, or want to build cool tools on top of MobX.
Also relevant are the various [`isObservable*` APIs](api.md#isobservable).

### `getDebugName`

Usage:

-   `getDebugName(thing, property?)`

Returns a (generated) friendly debug name of an observable object, property, reaction etc. Used for example by the [MobX developer tools](https://github.com/mobxjs/mobx-devtools).

### `getDependencyTree`

Usage:

-   `getDependencyTree(thing, property?)`.

Returns a tree structure with all observables the given reaction / computation currently depends upon.

### `getObserverTree`

Usage:

-   `getObserverTree(thing, property?)`.

Returns a tree structure with all reactions / computations that are observing the given observable.

### `getAtom`

Usage:

-   `getAtom(thing, property?)`.

Returns the backing _Atom_ of a given observable object, property, reaction etc.

# Spy

Usage:

-   `spy(listener)`

Registers a global spy listener that listens to all events that happen in MobX.
It is similar to attaching an `observe` listener to _all_ observables at once, but also notifies about running (trans/re)actions and computations.
Used for example by the [MobX developer tools](https://github.com/mobxjs/mobx-devtools).

Example usage of spying all actions:

```javascript
spy(event => {
    if (event.type === "action") {
        console.log(`${event.name} with args: ${event.arguments}`)
    }
})
```

Spy listeners always receive one object, which usually has at least a `type` field. The following events are emitted by default by spy:

| Type                            | observableKind | Other fields                                                   | Nested |
| ------------------------------- | -------------- | -------------------------------------------------------------- | ------ |
| action                          |                | name, object (scope), arguments[]                              | yes    |
| scheduled-reaction              |                | name                                                           | no     |
| reaction                        |                | name                                                           | yes    |
| error                           |                | name, message, error                                           | no     |
| add,update,remove,delete,splice |                | Check out [Intercept & observe {🚀}](intercept-and-observe.md) | yes    |
| report-end                      |                | spyReportEnd=true, time? (total execution time in ms)          | no     |

The `report-end` events are part of an earlier fired event that had `spyReportStart: true`.
This event indicates the end of an event and this way groups of events with sub-events are created.
This event might report the total execution time as well.

The spy events for observable values are identical to the events passed to `observe`.
In production builds, the `spy` API is a no-op as it will be minimized away.

Check out the [Intercept & observe {🚀}](intercept-and-observe.md#event-overview) section for an extensive overview.

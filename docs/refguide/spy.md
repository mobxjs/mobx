---
sidebar_label: spy
title: Spy
hide_title: true
---

# Spy

<div id='codefund'></div><div class="re_2020"><a class="re_2020_link" href="https://www.react-europe.org/#slot-2149-workshop-typescript-for-react-and-graphql-devs-with-michel-weststrate" target="_blank" rel="sponsored noopener"><div><div class="re_2020_ad" >Ad</div></div><img src="/img/reacteurope.svg"><span>Join the author of MobX at <b>ReactEurope</b> to learn how to use <span class="link">TypeScript with React</span></span></a></div>

Usage: `spy(listener)`.
Registers a global spy listener that listens to all events that happen in MobX.
It is similar to attaching an `observe` listener to _all_ observables at once, but also notifies about running (trans/re)actions and computations.
Used for example by the `mobx-react-devtools`.

Example usage of spying all actions:

```javascript
spy(event => {
    if (event.type === "action") {
        console.log(`${event.name} with args: ${event.arguments}`)
    }
})
```

Spy listeners always receive one object, which usually has at least a `type` field. The following events are emitted by default by spy.

| event                     | fields                                                              | nested |
| ------------------------- | ------------------------------------------------------------------- | ------ |
| action                    | name, object (scope), arguments                                     | yes    |
| scheduled-reaction        | name                                                                | no     |
| reaction                  | name                                                                | yes    |
| compute                   | name                                                                | no     |
| error                     | message                                                             | no     |
| update (array)            | object (the array), index, newValue, oldValue                       | yes    |
| update (map)              | object (observable map instance), name, newValue, oldValue          | yes    |
| update (object)           | object (instance), name, newValue, oldValue                         | yes    |
| splice (array)            | object (the array), index, added, removed, addedCount, removedCount | yes    |
| add (map)                 | object, name, newValue                                              | yes    |
| add (object)              | object, name, newValue                                              | yes    |
| delete (map)              | object, name, oldValue                                              | yes    |
| create (boxed observable) | object (ObservableValue instance), newValue                         | yes    |

Note that there are events with the signature `{ spyReportEnd: true, time? }`.
These events might not have a `type` field, but they are part of an earlier fired event that had `spyReportStart: true`.
This event indicates the end of an event and this way groups of events with sub-events are created.
This event might report the total execution time as well.

The spy events for observable values are identical to the events passed to `observe`. See [intercept & observe](observe.md) for an extensive overview.

In production builds, the `spy` API is a no-op as it will be minimized away.

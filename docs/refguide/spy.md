---
sidebar_label: spy [🚀]
title: Spy
hide_title: true
---

# Spy [🚀]

Usage:

-   `spy(listener)`

Registers a global spy listener that listens to all events that happen in MobX.
It is similar to attaching an `observe` listener to _all_ observables at once, but also notifies about running (trans/re)actions and computations.
Used for example by the [MobX developer tools](../react/react-integration/md#mobxdevtools).

Example usage of spying all actions:

```javascript
spy(event => {
    if (event.type === "action") {
        console.log(`${event.name} with args: ${event.arguments}`)
    }
})
```

Spy listeners always receive one object, which usually has at least a `type` field. The following events are emitted by default by spy.

| type                            | observableKind | other fields                                          | nested |
| ------------------------------- | -------------- | ----------------------------------------------------- | ------ |
| action                          |                | name, object (scope), arguments[]                     | yes    |
| scheduled-reaction              |                | name                                                  | no     |
| reaction                        |                | name                                                  | yes    |
| update                          | computed       | name                                                  | no     |
| error                           |                | name, message, error                                  | no     |
| add,update,remove,delete,splice | \*             | see [observe](observe.md)                             | yes    |
| report-end                      |                | spyReportEnd=true, time? (total execution time in ms) | no     |

The `report-end` events are part of an earlier fired event that had `spyReportStart: true`.
This event indicates the end of an event and this way groups of events with sub-events are created.
This event might report the total execution time as well.

The spy events for observable values are identical to the events passed to `observe`. See [intercept & observe](observe.md#event-overview) for an extensive overview.

In production builds, the `spy` API is a no-op as it will be minimized away.

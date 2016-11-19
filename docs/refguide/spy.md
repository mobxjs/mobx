# Spy

Usage: `spy(listener)`.
Registers a global spy listener that listens to all events that happen in MobX.
It is similar to attaching an `observe` listener to *all* observables at once, but also notifies about running (trans/re)actions and computations.
Used for example by the `mobx-react-devtools`.

Example usage of spying all actions:
```
spy((event) => {
    if (event.type === 'action') {
        console.log(`${event.name} with args: ${event.arguments}`)
    }
})
```

Spy listeners always receive one object, which usually has at least a `type` field. The following events are emitted by default by spy.

| event | fields | nested |
| --- | --- |--- |
| action | name, target (scope), arguments, fn (source function of the action | yes |
| transaction | name, target (scope) | yes |
| scheduled-reaction | object (Reaction instance) | no |
| reaction | object (Reaction instance), fn (source of the reaction) | yes
| compute | object (ComputedValue instance), target (scope), fn (source) | no
| error | message | no |
| update (array) | object (the array), index, newValue, oldValue | yes
| update (map) | object (observable map instance), name, newValue, oldValue | yes
| update (object) | object (instance), name, newValue, oldValue | yes
| splice (array) | object (the array), index, added, removed, addedCount, removedCount | yes
| add (map) | object, name, newValue | yes
| add (object) | object, name, newValue | yes
| delete (map) | object, name, oldValue | yes
| create (boxed observable) | object (ObservableValue instance), newValue | yes |

Note that there are events with the signature `{ spyReportEnd: true, time? }`.
These events might not have a `type` field, but they are part of an earlier fired event that had `spyReportStart: true`.
This event indicates the end of an event and this way groups of events with sub-events are created.
This event might report the total execution time as well.

The spy events for observable values are identical to the events passed to `observe`. See [intercept & observe](observe.md) for an extensive overview.

It is possible to emit your own spy events as well. See `extras.spyReport`, `extras.spyReportStart` and `extras.spyReportEnd`

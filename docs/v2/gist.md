
# The Gist of MobX

MobX distinguishes the following concepts in your application.

### 1. Observable state

_State_ is the data that drives your application.
Usually there is _domain specific state_ like a list of todo items and there is _view state_ such as the currently selected element.
State is like spreadsheets cells that hold a value.

---

The way to declare state in MobX is by [marking data `observable`](observables.md). For example:

```javascript
import { observable } from 'mobx'

const stopWatch = observable({
    // Introduce 2 observable properties, holding the state of this stopwatch
    start: Date.now(),
    now: Date.now()
})
```


### 2. Derivations

_Anything_ that can be derived from the _state_ without any further user interaction is a derivation.
Derivations exist in many forms:

* The _user interface_ is value derived from your application state.
* _computed values_, such as the number of todos left.
* _I/O operartions_ like sending changes to the server when state changes.

MobX distinguishes two categories of derivations:
* *Computed values*. These are values that can always be derived from the current observable state using a pure function.
* *Reactions*. Reactions are side effects that need to happen automatically if the state changes.

Reactions are needed as a bridge between imperative and reactive programming.
Without side effects no application can exist, as all application require I/O.
MobX helps you to clearly organize your side effects.

People starting with MobX tend to use reactions too often.
The golden rule is: if you want to create a value based on the current state, use `computed`.

Back to the spreadsheet analogy, formulas are derivations that *compute* a value. But for you as a user to be able to see it on the screen a *reaction* is needed that repaints part of the GUI.

---

Let's expand our above example with a [computed value](derivations.md), `elapsed` and a reaction, painting the `stopWatch` state.

```javascript
import { observable, autorun } from 'mobx'

const stopWatch = observable({
    start: Date.now(),
    now: Date.now(),
    // introduce a computed value by defining a `getter property`
    get elapsed() {
        const elapsed = Math.max(0, this.now - this.start)
        return `${Math.floor(elapsed / 1000)}s ${elapsed % 1000}ms.`
    }
})

function paint() {
    document.body.innerHTML = `<span>${stopWatch.elapsed}</span>`
}

// set up a reaction
autorun(paint)
```

`paint` is a function that doesn't produce a value, it produces a side-effect, updating the DOM.

On the other hand, `elapsed` is a computed value. Computed values are quite smart and have few interesting properties.
1. They will not recompute if nobody is interested in their value
2. They won't recompute if the observables they use didn't change. Regardless how often you ask about their value (with one [exception](TODO link)).

`autorun` schedules the paint function for automatic execution, and in fact wires up the reaction. It starts pulling values from our state, through the computed values, into our side effect.
However, so far, it does this only once, since the state in this app never changes.

### 3. Actions

An [_action_](action.md) is any piece of code that changes the _state_. User events, backend data pushes, scheduled events, etc.
An action is like a user that enters a new value in a spreadsheet cell.

Actions can be defined explicitly in MobX to help you to structure code more clearly; it makes clear where state transitions are happening.

---

An action to make our stopwatch run looks like this:

```javascript
import { action } from 'mobx'

const tick = action(() => {
    stopWatch.now = Date.now()
})

// Trigger the action every 10 ms.
setInterval(tick, 10)
```


Here are some observations:
1. There are no explicit data subscription anywhere. Instead, MobX will run `paint` once, transparently track which observables `paint` depends on, and make sure the function gets to re-run: once any these observables change.
2. There is no change detection in MobX. Instead, updating one of the `stopWatch` fields will just cause the new value for that observable to be propageted through the computed values and reactions.

Feel free to play with this example on [codesandbox.io](https://codesandbox.io/s/k0zy283m7).
Some things you might try:

* Lower the interval speed and add `console.log` statements to `elapsed`, `tick` and `paint`.
* Implement a "restart" button
* See how changing `stopWatch.elapsed` to `stopWatch.start` in `paint()` will cause the app to only re-render when you press the restart button. Regardless of how often `tick` is invoked.
* Add some conditional rendering to `paint`. For example don't show milliseconds if more then 10 seconds have passed. Note how that influence the amount of repaints.

_P.S. In cause you were wondering, yes, [time is an observable](https://github.com/mobxjs/mobx-utils#now). We just `tick` manually in this example for educational purposes._

## Sneak preview: A React Component

TODO: code + sandbox here

[codesandbox.io](https://codesandbox.io/s/k0zy283m7)

## The MobX data flow

MobX introduces a uni-directional data flow where _actions_ change the _state_, which in turn updates all affected _derivations_.

![Action, State, View](../images/action-state-view.png)

All _Derivations_ are updated **automatically** and **atomically** when the _state_ changes. As a result it is never possible to observe stale or intermediate values (glitches).

All _Computed values_ are updated **synchronously**. This means that, for example, _actions_ can safely inspect a computed value and find an up-to-date value, directly after each _state_ change.

_Computed values_ are updated **lazily**. Any computed value that is not actively in use will not be updated until it is needed again for a side effect (I/O).
If a view is no longer in use it will be garbage collected automatically.

All _Computed values_ should be **pure**. They are not supposed to change _state_.

If MobX is used with [enforce _actions_ enabled](TODO link), MobX will enforce that no state can be modified outside actions.

---

You have now seen all the basic concepts in MobX. MobX is proudly build at [Mendix](http://mendix.com) for scale. And supports many different kinds of observable data structures and data sources. And is used in applications that have hundreds of UI components and and hundreds of thousands observables. But regardless scale, you will able to recognize the above concepts in any MobX driven application.
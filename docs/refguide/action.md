---
title: action
sidebar_label: action
hide_title: true
---

# action

Usage:

-   `action(fn)`
-   `action(name, fn)`
-   `action.bound(fn)`
-   `makeObservable(this, {someProperty: action})`
-   `makeObservable(this, {someProperty: action(name)})`
-   `makeObservable(this, {someProperty: action.bound})`

Any application has actions. Actions is code that that modifies the state.
MobX requires that you declare your actions, though [makeAutoObservable](make-observable.md) can automate much of this job. Actions help you to structure your code better and offer performance benefits.

Actions are wrapped with with [`transaction`](api.md#transaction), [`untracked`](api.md#untracked), and [`allowStateChanges`](api.md#untracked).

Especially the fact that [`transaction`](api.md#transaction) is applied automatically yields great performance benefits;
actions will batch mutations and only notify computed values and reactions after the (outer most) action has finished.
This ensures that intermediate or incomplete values produced during an action are not visible to the rest of the application until the action has finished.

`action` also provides useful debugging information in combination with the devtools.

By passing in `name` you can control the name of the action, otherwise it
is derived from the function or method that is wrapped.

[setters](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/set) of [computed properties are automatically actions](computed.md).

## When are functions and methods not actions?

Actions should only, and always, be used on functions that _modify_ state.
Functions that just perform look-ups, filters etc should _not_ be marked as actions; to allow MobX to track their invocations.

If you use `makeAutoObservable` you have to [exclude these methods explicitly from being marked as actions](make-observable.md#excluding-methods-that-are-not-actions).

## Actions and async code

There are some special rules you have to take into account when you have actions that
are asynchronous. See [asynchronous actions](../best/actions.md).

## action.bound

The `action` function follows the normal rules for binding in JavaScript.
However, `action.bound` can be used to automatically bind actions to the targeted object. This ensures that `this` points to the right object when you use
the action as a callback later.

Note that unlike `action`, `action.bound` does not take a name parameter, so the name will always be based on the property name to which the action is bound.

Example:

```javascript
class Ticker {
    tick = 0

    constructor() {
        makeObservable(this, { tick: observable, increment: action.bound })
    }

    increment() {
        this.tick++ // 'this' will always be correct
    }
}

const ticker = new Ticker()
setInterval(ticker.increment, 1000)
```

## bound arrow functions

You cannot use _action.bound_ with arrow functions; arrow functions are already bound and cannot be rebound. Since arrow functions are already bound, using them is an alternative to `action.bound` in classes. They have the additional benefit that you can use them with `makeAutoObservable` without the need for explicit declaration:

```javascript
class Ticker {
    tick = 0

    constructor() {
        makeAutoObservable(this)
    }

    // note declaration as an arrow function
    increment = () => {
        this.tick++ // 'this' will always be correct
    }
}

const ticker = new Ticker()
setInterval(ticker.increment, 1000)
```

## Disabling mandatory actions

By default, MobX 6 and later require that you use actions to make state changes.
You can however configure MobX to disable this behavior, see [`enforceActions`](api.md#enforceactions).

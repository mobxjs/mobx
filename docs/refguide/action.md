---
title: action
sidebar_label: action
hide_title: true
---

# action

<div id='codefund'></div><div class="re_2020"><a class="re_2020_link" href="https://www.react-europe.org/#slot-2149-workshop-typescript-for-react-and-graphql-devs-with-michel-weststrate" target="_blank" rel="sponsored noopener"><div><div class="re_2020_ad" >Ad</div></div><img src="/img/reacteurope.svg"><span>Join the author of MobX at <b>ReactEurope</b> to learn how to use <span class="link">TypeScript with React</span></span></a></div>

<details>
    <summary style="color: white; background:green;padding:5px;margin:5px;border-radius:2px">egghead.io lesson 5: actions</summary>
    <br>
    <div style="padding:5px;">
        <iframe style="border: none;" width=760 height=427  src="https://egghead.io/lessons/react-use-mobx-actions-to-change-and-guard-state/embed" ></iframe>
    </div>
    <a style="font-style:italic;padding:5px;margin:5px;"  href="https://egghead.io/lessons/react-use-mobx-actions-to-change-and-guard-state">Hosted on egghead.io</a>
</details>

Usage:

-   `action(fn)`
-   `action(name, fn)`
-   `@action classMethod() {}`
-   `@action(name) classMethod () {}`
-   `@action boundClassMethod = (args) => { body }`
-   `@action(name) boundClassMethod = (args) => { body }`
-   `@action.bound classMethod() {}`

Any application has actions. Actions are anything that modify the state.
With MobX you can make it explicit in your code where your actions live by marking them.
Actions help you to structure your code better.

It takes a function and returns a function with the same signature, but wrapped with `transaction`, `untracked`, and `allowStateChanges`.
Especially the fact that `transaction` is applied automatically yields great performance benefits;
actions will batch mutations and only notify computed values and reactions after the (outer most) action has finished.
This makes sure intermediate or incomplete values produced during an action are not visible to the rest of the application until the action has finished.

It is advised to use `(@)action` on any function that modifies observables or has side effects.
`action` also provides useful debugging information in combination with the devtools.

Using the `@action` decorator with setters (i.e. `@action set propertyName`) is not supported; however, setters of [computed properties are automatically actions](computed-decorator.md).

Note: using `action` is mandatory when MobX is configured to require actions to make state changes, see [`enforceActions`](api.md#configure).

## When to use actions?

Actions should only, and always, be used on functions that _modify_ state.
Functions that just perform look-ups, filters etc should _not_ be marked as actions; to allow MobX to track their invocations.

["enforce actions"](api.md#configure) enforces that all state modifications are done by an action. This is a useful best practice in larger, long term code bases.

## Bound actions

The `action` decorator / function follows the normal rules for binding in javascript.
However, `action.bound` can be used to automatically bind actions to the targeted object.
Note that unlike `action`, `(@)action.bound` does not take a name parameter, so the name will always be based on the property name to which the action is bound.

Example:

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

_Note: don't use *action.bound* with arrow functions; arrow functions are already bound and cannot be rebound._

## `runInAction(name?, thunk)`

`runInAction` is a simple utility that takes an code block and executes in an (anonymous) action. This is useful to create and execute actions on the fly, for example inside an asynchronous process. `runInAction(f)` is sugar for `action(f)()`

# action

<a style="color: white; background:green;padding:5px;margin:5px;border-radius:2px" href="https://egghead.io/lessons/react-use-mobx-actions-to-change-and-guard-state">egghead.io lesson 5: actions</a>

Usage:
* `action(fn)`
* `action(name, fn)`
* `@action classMethod() {}`
* `@action(name) classMethod () {}`
* `@action boundClassMethod = (args) => { body }`
* `@action(name) boundClassMethod = (args) => { body }`
* `@action.bound classMethod() {}`

Any application has actions. Actions are anything that modify the state.
With MobX you can make it explicit in your code where your actions live by marking them.
Actions help you to structure your code better.

It takes a function and returns a function with the same signature, but wrapped with `transaction`, `untracked`, and `allowStateChanges`.
Especially the fact that `transaction` is applied automatically yields great performance benefits;
actions will batch mutations and only notify computed values and reactions after the (outer most) action has finished.
This makes sure intermediate or incomplete values produced during an action are not visible to the rest of the application until the action has finished.

It is advised to use `(@)action` on any function that modifies observables or has side effects.
`action` also provides useful debugging information in combination with the devtools.

Using the `@action` decorator with setters (i.e. `@action set propertyName`) is not supported; however, setters of [computed properties are automatically actions](https://github.com/mobxjs/mobx/blob/gh-pages/docs/refguide/computed-decorator.md#setters-for-computed-values).

Note: using `action` is mandatory when MobX is configured to require actions to make state changes, see [`useStrict`](https://github.com/mobxjs/mobx/blob/gh-pages/docs/refguide/api.md#configure).

## When to use actions?

Actions should only, and always, be used on functions that _modify_ state.
Functions that just perform look-ups, filters etc should _not_ be marked as actions; to allow MobX to track their invocations.


["enforce actions"](https://github.com/mobxjs/mobx/blob/gh-pages/docs/refguide/api.md#configure) enforces that all state modifications are done by an action. This is a useful best practice in larger, long term code bases.

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


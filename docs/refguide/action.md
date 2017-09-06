# action

Usage:
* `action(fn)`
* `action(name, fn)`
* `@action classMethod() {}`
* `@action(name) classMethod () {}`
* `@action boundClassMethod = (args) => { body }`
* `@action(name) boundClassMethod = (args) => { body }`
* `@action.bound classMethod() {}`
* `@action.bound(function() {})`

Any application has actions. Actions are anything that modify the state.
With MobX you can make it explicit in your code where your actions live by marking them.
Actions help you to structure your code better.

It takes a function and returns a function with the same signature.
But wrapped with `transaction`, `untracked` and `allowStateChanges`.
Especially the fact that `transaction` is applied automatically yields great performance benefits;
actions will batch mutations and only notify computed values and reactions after the (outer most) action has finished.
This makes sure intermediate or incomplete values produced during an action are not visible to the rest of the application until the action has finished.

It is advised to use `(@)action` on any function that modifies observables or has side effects.
`action` also provides useful debugging information in combination with the devtools.

Using the `@action` decorator with [ES 5.1 setters](http://www.ecma-international.org/ecma-262/5.1/#sec-11.1.5) (i.e. `@action set propertyName`) is not supported, however setters of [computed properties are automatically actions](https://github.com/mobxjs/mobx/blob/gh-pages/docs/refguide/computed-decorator.md#setters-for-computed-values).

Note: using `action` is mandatory when *strict mode* is enabled, see [`useStrict`](https://github.com/mobxjs/mobx/blob/gh-pages/docs/refguide/api.md#usestrict).

For an extensive introduction to `action` see also the [MobX 2.2 release notes](https://medium.com/p/45cdc73c7c8d/).

Two example actions from the `contact-list` project:

```javascript
	@action	createRandomContact() {
		this.pendingRequestCount++;
		superagent
			.get('https://randomuser.me/api/')
			.set('Accept', 'application/json')
			.end(action("createRandomContact-callback", (error, results) => {
				// ^ Note: asynchronous callbacks are separate actions!
				if (error)
					console.error(error);
				else {
					const data = JSON.parse(results.text).results[0];
					const contact = new Contact(this, data.dob, data.name, data.login.username, data.picture)
					contact.addTag('random-user');
					this.contacts.push(contact);
					this.pendingRequestCount--;
				}
			}));
	}
```


## When to use actions?

Actions should only, and always, be used on functions that _modify_ state.
Functions that just perform look-ups, filters etc should _not_ be marked as actions; to allow MobX to track their invocations.

Note in the above example that writing asynchronous actions is as straight forward as marking all the callbacks as `action` as well.
Beyond that there is nothing special about asynchronous processes in MobX; an asynchronous update is just a synchronous action call in some future.

[_Strict mode_](https://github.com/mobxjs/mobx/blob/gh-pages/docs/refguide/api.md#usestrict) enforces that all state modifications are done by an action. This is a useful best practice in larger, long term code bases. Simply call `mobx.useStrict(true)` when your application is initialized, and MobX will throw anytime you (accidentally) try to modify state without using an action.

The [Writing async actions](https://mobx.js.org/best/actions.html) section provides several syntactical recipes on how to organize asynchronous actions, in combination with promises, async / await, generators etc. Read it for inspiration!

## Bound actions

The `action` decorator / function follows the normal rules for binding in javascript.
However, Mobx 3 introduces `action.bound` to automatically bind actions to the targeted object.
Note that unlike `action`, `(@)action.bound` does not take a name parameter, so the name will always be based on the property name to which the action is bound.

Example:

```javascript
class Ticker {
	@observable this.tick = 0

	@action.bound
	increment() {
		this.tick++ // 'this' will always be correct
	}
}

const ticker = new Ticker()
setInterval(ticker.increment, 1000)
```

Or

```javascript
const ticker = observable({
	tick: 1,
	increment: action.bound(function() {
		this.tick++ // bound 'this'
	})
})

setInterval(ticker.increment, 1000)
```

_Note: don't use *action.bound* with arrow functions; arrow functions are already bound and cannot be rebound._


## `runInAction(name?, thunk)`

`runInAction` is a simple utility that takes an code block and executes in an (anonymous) action. This is useful to create and execute actions on the fly, for example inside an asynchronous process. `runInAction(f)` is sugar for `action(f)()`


#action

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
It takes a function and returns it after wrapping it with `untracked`, `transaction` and `allowStateChanges`.
It is advised to use them on any function that modifies observables or has side effects.
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


## Creating asynchronous actions

`action` only affects the currently running function, not functions that are scheduled (but not invoked) by the current function!
This means that if you have a `setTimeout`, promise`.then` or `async` construction, and in that callback some more state is changed, those callbacks should be wrapped in `action` as well! There are several ways to create asynchronous actions. No approach is strictly better then the other, but this section just list different approaches you can take to writing asynchronous code.
Let's start with a basic example:

### Promises

```javascript
mobx.useStrict(true) // don't allow state modifications outside actions

class Store {
	@observable githubProjects = []
	@state = "pending" // "pending" / "done" / "error"

	@action
	fetchProjects() {
		this.githubProjects = []
		this.state = "pending"
		fetchGithubProjectsSomehow().then(
			projects => {
				const filteredProjects = somePreprocessing(projects)
				this.githubProjects = filteredProjects
				this.state = "done"
			},
			error => {
				this.state = "error"
			}
		)
	}
}
```

The above example would throw exceptions, as the callbacks passed to the `fethGithubProjectsSomehow` promise are not part of the `fetchProjects` action, as actions only apply to the current stack.

A first simple fix is to extract the callbacks to actions. (Note that binding is important here to get a correct `this`):

```javascript
class Store {
	@observable githubProjects = []
	@state = "pending" // "pending" / "done" / "error"

	@action
	fetchProjects() {
		this.githubProjects = []
		this.state = "pending"
		fetchGithubProjectsSomehow().then(fetchProjectsSuccess, fetchProjectsError)
	}

	@action.bound // callback action
	fetchProjectsSuccess(projects) {
		const filteredProjects = somePreprocessing(projects)
		this.githubProjects = filteredProjects
		this.state = "done"
	}

	@action.bound // callback action
	fetchProjectsError(error) {
		this.state = "error"
	}
}
```

Although this is clean and explicit, it might get a bit verbose with complex async flows. Alternative, you can wrap the promise callbacks with the `action` keyword. It is recommended but not mandatory to give them a name as well:

```javascript
mobx.useStrict(true) // don't allow state modifications outside actions

class Store {
	@observable githubProjects = []
	@state = "pending" // "pending" / "done" / "error"

	@action
	fetchProjects() {
		this.githubProjects = []
		this.state = "pending"
		fetchGithubProjectsSomehow().then(
			// inline created action
			action("fetchSuccess", projects => {
				const filteredProjects = somePreprocessing(projects)
				this.githubProjects = filteredProjects
				this.state = "done"
			}),
			// inline created action
			action("fetchError", error => {
				this.state = "error"
			})
		)
	}
}
```

### The `runInAction` utility

A downside of inline actions is that TypeScript does not apply type inference on them, so you would have type all your callbacks.
Instead of creating an action for the entire callback, you can also run only the state modifying part of the callback in an action.
The advantage of this pattern is that it encourages you to not litter the place with `action`, but rather put all the state modifications as much as possible at the end of the whole process:

```javascript
mobx.useStrict(true) // don't allow state modifications outside actions

class Store {
	@observable githubProjects = []
	@state = "pending" // "pending" / "done" / "error"

	@action
	fetchProjects() {
		this.githubProjects = []
		this.state = "pending"
		fetchGithubProjectsSomehow().then(
			projects => {
				const filteredProjects = somePreprocessing(projects)
				// put the 'final' modification in an anonymous action
				runInAction(() => {
					this.githubProjects = filteredProjects
					this.state = "done"
				})
			},
			error => {
				// the alternative ending of this process:...
				runInAction(() => {
					this.state = "error"
				})
			}
		)
	}
}
```

Note that `runInAction`'s can also be given a name as first argument. `runInAction(f)` is in fact just sugar for `action(f)()`

### async / await

Async / await based functions can confusing initially when starting with actions.
Because lexically they appear to synchronous functions, it gives the impression that `@action` applies to the entire function.
Which is of course not the case, as async / await is just syntactic sugar around a promise based process.
As a result, `@action` only applies to the code block until the first `await`.
And after each `await` a new asynchronous function is started, so after each `await`, state modifying code should be wrapped as action.
This is where `runInAction` comes in handy again:

```javascript
mobx.useStrict(true) // don't allow state modifications outside actions

class Store {
	@observable githubProjects = []
	@state = "pending" // "pending" / "done" / "error"

	@action
	async fetchProjects() {
		this.githubProjects = []
		this.state = "pending"
		try {
			const projects = await fetchGithubProjectsSomehow()
			const filteredProjects = somePreprocessing(projects)
			// after await, modifying state again, needs an actions:
			runInAction(() => {
				this.state = "done"
				this.githubProjects = filteredProjects
			})
		} catch (error) {
			runInAction(() => {
				this.state = "error"
			})
		}
	}
}
```

### babel-plugin-mobx-deep-action

If you use babel, there is a plugin that scans for `@action` methods and automatically wraps all callbacks and await statements properly in actions during transpilation: [mobx-deep-action](https://github.com/mobxjs/babel-plugin-mobx-deep-action).

### Generators & asyncAction

Finally there is the `asyncAction` utility in the [`mobx-utils` package](https://github.com/mobxjs/mobx-utils) that uses generators behind the scenes to automatically wrap yielded promises in actions. The advantage of this is that it is syntactically very close to async / await (with different keywords), and no manually action wrapping is needed for async parts, resulting in very clean code.
Just make sure every `yield` returns a promise.

`asyncAction` can be used as decorator and as function (just like `@action`).
`asyncAction` integrates neatly with MobX development tools, so that it is easy to trace the process of the async function.
For more details see the docs of [asyncAction](https://github.com/mobxjs/mobx-utils#asyncaction).

```javascript
import {asyncAction} from "mobx-utils"

mobx.useStrict(true) // don't allow state modifications outside actions

class Store {
	@observable githubProjects = []
	@state = "pending" // "pending" / "done" / "error"

	@asyncAction
	*fetchProjects() { // <- note the star, this a generator function!
		this.githubProjects = []
		this.state = "pending"
		try {
			const projects = yield fetchGithubProjectsSomehow() // yield instead of await
			const filteredProjects = somePreprocessing(projects)
			// the asynchronous blocks will automatically be wrapped actions
			this.state = "done"
			this.githubProjects = filteredProjects
		} catch (error) {
			this.state = "error"
		}
	}
}
```

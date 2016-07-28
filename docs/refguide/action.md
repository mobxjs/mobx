#action

Usage:
* `action(fn)`
* `action(name, fn)`
* `@action classMethod`
* `@action(name) classMethod`
* `@action boundClassMethod = (args) => { body }`
* `@action(name) boundClassMethod = (args) => { body }`

Any application has actions. Actions are anything that modify the state.
With MobX you can make it explicit in your code where your actions live by marking them.
Actions help you to structure your code better.
It takes a function and returns it after wrapping it with `untracked`, `transaction` and `allowStateChanges`.
It is advised to use them on any function that modifies observables or has side effects.
`action` also provides useful debugging information in combination with the devtools.
Note: using `action` is mandatory when *strict mode* is enabled, see [`useStrict`](https://github.com/mobxjs/mobx/blob/gh-pages/docs/refguide/api.md#usestrict). Using the `@action` decorator with [ES 5.1 setters](http://www.ecma-international.org/ecma-262/5.1/#sec-11.1.5) (i.e. `@action set propertyName`) is not supported.

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

## `async` actions and `runInAction`.

`action` only affects the currently running function, not functions that are scheduled (but not invoked) by the current function!
This means that if you have a `setTimeout`, promise`.then` or `async` construction, and in that callback some more state is changed, those callbacks should be wrapped in `action` as well!
This is demonstrated above with the `"createRandomContact-callback"` action.

If you use `async` / `await`, this is a bit trickier as you cannot just wrap the async function body in `action`.
In this situation `runInAction` can come in handy, wrap this around the places where you intend to update the state.
(But don't make `await` calls in these blocks).

Example:
```javascript
@action /*optional*/ updateDocument = async () => {
    const data = await fetchDataFromUrl();
    /* required in strict mode to be allowed to update state: */
    runInAction("update state after fetching data", () => {
        this.data.replace(data);
        this.isSaving = true;
    })
}
```

The usage of `runInAction` is: `runInAction(name?, fn, scope?)`.

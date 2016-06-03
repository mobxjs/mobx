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
Note: using `action` is mandatory when *strict mode* is enabled, see `useStrict`.

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

## Note on async actions

`action` only affects the currently running function, not functions that are scheduled (but not invoked) by the current function!
This means that if you have a `setTimeout`, promise`.then` or `async` construction, and in that callback some more state is changed, those callbacks should be wrapped in `action` as well!
For debugging purposes, you can then give them a nice name as well :)

So the second `action` is required in the next example if in _strict mode_, as the asynchronous function will modify state:
```javascript
@action /*optional*/ updateDocument = async action/*required!*/(() => {
   this.isSaving = true;
   ....
})
```
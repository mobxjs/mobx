# when

<a style="color: white; background:green;padding:5px;margin:5px;border-radius:2px" href="https://egghead.io/lessons/react-write-custom-mobx-reactions-with-when-and-autorun">egghead.io lesson 9: custom reactions</a>

`when(predicate: () => boolean, effect?: () => void, options?)`

`when` observes & runs the given `predicate` until it returns true.
Once that happens, the given `effect` is executed and the autorunner is disposed.
The function returns a disposer to cancel the autorunner prematurely.

This function is really useful to dispose or cancel stuff in a reactive way.
For example:

```javascript
class MyResource {
	constructor() {
		when(
			// once...
			() => !this.isVisible,
			// ... then
			() => this.dispose()
		);
	}

	@computed get isVisible() {
		// indicate whether this item is visible
	}

	dispose() {
		// dispose
	}
}
```

## when-promise

If there is no `effect` function provided, `when` will return a `Promise`. This combines nicely with `async / await`

```javascript
async function() {
	await when(() => that.isVisible)
	// etc..
}
```

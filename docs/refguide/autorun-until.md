# autorunUntil

`autorunUntil(predicate: () => boolean, effect: () => void, scope?)`

`autorunUntil` observes & runs the given `predicate` until it returns true.
Once that happens, the given `effect` is executed and the autorunner is disposed.
The function returns a disposer to cancel the autorunner prematurely.

This function is really useful to dispose or cancel stuff in a reactive way.
For example:

```javascript
class MyResource {
	constructor() {
		autorunUntil(
			// once...
			() => !this.isVisible,
			// ... then
			() => this.dispose()
		);
	}
	
	@observable get isVisible() {
		// indicate whether this item is visible
	}
	
	dispose() {
		// dispose
	}
}

```
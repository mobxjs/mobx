# autorunAsync

`autorunAsync(action: () => void, minimumDelay?: number, scope?)`

Just like `autorun` except that the action won't be invoked synchronously but asynchronously after the minimum amount of milliseconds has passed.
The `action` will be run and observed.
However, instead of running the action immediately when the values observed by it have changed, the `minimumDelay` will be awaited before re-execution the `action` again.

If observed values are changed multiple times while waiting, the action is still triggered only once, so in the sense it achieves a similar effect as a transaction.
This might be useful for stuff that is expensive and doesn't need to happen synchronously; such as debouncing server communication.

Returns a disposer to cancel the autorun.

```javascript
autorun(() => {
	// assuming that profile.asJson returns an observable json representation of profile,
	// send it to the server each time it is changed, but await at least 300mseconds before sending it
	// when send, the latest value of profile.asJson will be used.
	sendProfileToServer(profile.asJson);
}, 300);
```
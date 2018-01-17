# autorunAsync

`autorunAsync(action: () => void, minimumDelay?: number, scope?)`

Just like `autorun` except that the action won't be invoked synchronously but asynchronously after the minimum amount of milliseconds has passed.
The `action` will be run and observed.
However, instead of running the action immediately when the values it observes have changed, the `minimumDelay` will be awaited before re-execution the `action` again.

If observed values are changed multiple times while waiting, the action is still triggered only once, so in a sense it achieves a similar effect than a transaction.
This might be useful for stuff that is expensive and doesn't need to happen synchronously; such as debouncing server communication.

If a scope is given, the action will be bound to this scope object.

`autorunAsync(action: () => void, scheduler: (callback: () => void) => any, scope?)`

If a function is passed in as the delay it will be treated as a scheduling function.
This scheduling function must take a single callback function as an argument.
Rather than waiting until the number of milliseconds has passed, it will wait until the callback has been executed before invoking `action`.

A common use case for this is rendering to a canvas.
Using `autorun` will cause the canvas to re-render for every change in the data it is observing.
If the rendering function is expensive this will impact the smoothness of animations.
If `requestAnimationFrame` is passed as the `scheduler`, mobx will only invoke the `action` after the callback to `requestAnimationFrame` executes.

```javascript
autorunAsync(() => {
    renderToCanvas()
}, requestAnimationFrame)
```

`autorunAsync(debugName: string, action: () => void, minimumDelay?: number, scope?)`

If a string is passed as first argument to `autorunAsync`, it will be used as debug name.

`autorunAsync` returns a disposer to cancel the autorun.

```javascript
autorunAsync(() => {
	// Assuming that profile.asJson returns an observable Json representation of profile,
	// send it to the server each time it is changed, but await at least 300 milliseconds before sending it.
	// When sent, the latest value of profile.asJson will be used.
	sendProfileToServer(profile.asJson);
}, 300);
```

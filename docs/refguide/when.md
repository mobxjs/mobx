---
title: when
sidebar_label: when
hide_title: true
---

# when

Usage:

-   `when(predicate: () => boolean, effect?: () => void, options?)`
-   `when(predicate: () => boolean): Promise

`when` observes and runs the given _predicate_ function until it returns `true`.
Once that happens, the given _effect_ function is executed and the autorunner is disposed.

This function is really useful to dispose or cancel stuff in a reactive way.
For example:

```javascript
import { when, makeAutoObservable } from "mobx"

class MyResource {
    constructor() {
        makeAutoObservable(this, { dispose: false })
        when(
            // once...
            () => !this.isVisible,
            // ... then
            () => this.dispose()
        )
    }

    get isVisible() {
        // indicate whether this item is visible
    }

    dispose() {
        // dispose
    }
}
```

As soon as `isVisible` becomes `false`, the `dispose` method is called that
then does some cleanup for `MyResource`.

`when` returns a disposer to allow you to cancel it manually, unless you don't pass in a second `effect` function, in which case it returns a `Promise`.

[Read more about why it's important to dispose](../best/dispose-reactions).

## when-promise

If no `effect` function is provided, `when` returns a `Promise`. This combines nicely with `async / await` to let you wait for changes in observable state:

```javascript
async function() {
	await when(() => that.isVisible)
	// etc..
}
```

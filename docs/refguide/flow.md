---
title: flow
sidebar_label: flow
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# flow

Usage:

-   `flow(function* (args) { })`

`flow` is an alternative to `async` / `await` that makes it more easy to
work with MobX actions.

`flow()` takes a [generator function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator) as its only input. You must only _yield_ to promises inside. `flow` gives you back a promise that you can `cancel()` if you want.

When dealing with _async actions_, the code that executes in the callback is not wrapped by `action`. An easy way to retain the action semantics is by wrapping the async function with flow. This will ensure to wrap all your callbacks in `action()`. See also [asynchronous actions](../best/actions#flow).

Example:

```js
import { flow, makeAutoObservable } from "mobx"

class Store {
    githubProjects = []
    state = "pending" // "pending" / "done" / "error"
    constructor() {
        makeAutoObservable(this)
    }

    fetchProjects = flow(function* fetchProjects() {
        // <- note the star, this a generator function!
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
    })
}
```

_Tip: it is recommended to give the generator function a name, this is the name that will show up in dev tools and such_

**Flows can be cancelled**

Flows are canceallable, that means that you can call `cancel()` on the returned promise. This will stop the generator immediately, but any `finally` clause will still be processed. The returned promise itself will reject with `FLOW_CANCELLED`

If you want to write code that catches `FlowCancellationError` you can import it from the `mobx` package. Also exported is a `isFlowCancellationError(error)` helper that returns `true` if and only if the provided argument is a `FlowCancellationError`.

**Flows support async iterators**

Flows support async iterators, that means you can use async generators:

```javascript
async function* someNumbers() {
    yield Promise.resolve(1)
    yield Promise.resolve(2)
    yield Promise.resolve(3)
}

const count = mobx.flow(async function* () {
    // use for await to loop async iterators
    for await (const number of someNumbers()) {
        total += number
    }
    return total
})

const res = await count() // 6
```

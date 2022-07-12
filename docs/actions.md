---
title: Updating state using actions
sidebar_label: Actions
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Updating state using actions

Usage:

-   `action` _(annotation)_
-   `action(fn)`
-   `action(name, fn)`

All applications have actions. An action is any piece of code that modifies the state. In principle, actions always happen in response to an event. For example, a button was clicked, some input changed, a websocket message arrived, etc.

MobX requires that you declare your actions, although [`makeAutoObservable`](observable-state.md#makeautoobservable) can automate much of this job. Actions help you structure your code better and offer the following performance benefits:

1. They are run inside [transactions](api.md#transaction). No reactions will be run until the outer-most action has finished, guaranteeing that intermediate or incomplete values produced during an action are not visible to the rest of the application until the action has completed.

2. By default, it is not allowed to change the state outside of actions. This helps to clearly identify in your code base where the state updates happen.

The `action` annotation should only be used on functions that intend to _modify_ the state. Functions that derive information (performing lookups or filtering data) should _not_ be marked as actions, to allow MobX to track their invocations. `action` annotated members will be non-enumerable.

## Examples

<!--DOCUSAURUS_CODE_TABS-->
<!--makeObservable-->

```javascript
import { makeObservable, observable, action } from "mobx"

class Doubler {
    value = 0

    constructor(value) {
        makeObservable(this, {
            value: observable,
            increment: action
        })
    }

    increment() {
        // Intermediate states will not become visible to observers.
        this.value++
        this.value++
    }
}
```

<!--makeAutoObservable-->

```javascript
import { makeAutoObservable } from "mobx"

class Doubler {
    value = 0

    constructor(value) {
        makeAutoObservable(this)
    }

    increment() {
        this.value++
        this.value++
    }
}
```

<!--action.bound-->

```javascript
import { makeObservable, observable, action } from "mobx"

class Doubler {
    value = 0

    constructor(value) {
        makeObservable(this, {
            value: observable,
            increment: action.bound
        })
    }

    increment() {
        this.value++
        this.value++
    }
}

const doubler = new Doubler()

// Calling increment this way is safe as it is already bound.
setInterval(doubler.increment, 1000)
```

<!--action(fn)-->

```javascript
import { observable, action } from "mobx"

const state = observable({ value: 0 })

const increment = action(state => {
    state.value++
    state.value++
})

increment(state)
```

<!--runInAction(fn)-->

```javascript
import { observable, runInAction } from "mobx"

const state = observable({ value: 0 })

runInAction(() => {
    state.value++
    state.value++
})
```

<!--END_DOCUSAURUS_CODE_TABS-->

## Wrapping functions using `action`

To leverage the transactional nature of MobX as much as possible, actions should be passed as far outward as possible. It is good to mark a class method as an action if it modifies the state. It is even better to mark event handlers as actions, as it is the outer-most transaction that counts. A single unmarked event handler that calls two actions subsequently would still generate two transactions.

To help create action based event handlers, `action` is not only an annotation, but also a higher order function. It can be called with a function as an argument, and in that case it will return an `action` wrapped function with the same signature.

For example in React, an `onClick` handler can be wrapped as below.

```javascript
const ResetButton = ({ formState }) => (
    <button
        onClick={action(e => {
            formState.resetPendingUploads()
            formState.resetValues()
            e.preventDefault()
        })}
    >
        Reset form
    </button>
)
```

For debugging purposes, we recommend to either name the wrapped function, or pass a name as the first argument to `action`.

<details id="actions-are-untracked"><summary>**Note:** actions are untracked<a href="#actions-are-untracked" class="tip-anchor"></a></summary>

Another feature of actions is that they are [untracked](api.md#untracked). When an action is called from inside a side effect or a computed value (very rare!), observables read by the action won't be counted towards the dependencies of the derivation

`makeAutoObservable`, `extendObservable` and `observable` use a special flavour of `action` called [`autoAction`](observable-state.md#autoAction),
that will determine at runtime if the function is a derivation or action.

</details>

## `action.bound`

Usage:

-   `action.bound` _(annotation)_

The `action.bound` annotation can be used to automatically bind a method to the correct instance, so that `this` is always correctly bound inside the function.

<details id="auto-bind"><summary>**Tip:** use `makeAutoObservable(o, {}, { autoBind: true })` to bind all actions and flows automatically<a href="#avoid-bound" class="tip-anchor"></a></summary>

```javascript
import { makeAutoObservable } from "mobx"

class Doubler {
    value = 0

    constructor(value) {
        makeAutoObservable(this, {}, { autoBind: true })
    }

    increment() {
        this.value++
        this.value++
    }

    *flow() {
        const response = yield fetch("http://example.com/value")
        this.value = yield response.json()
    }
}
```

</details>

## `runInAction`

Usage:

-   `runInAction(fn)`

Use this utility to create a temporary action that is immediately invoked. Can be useful in asynchronous processes.
Check out the [above code block](#examples) for an example.

## Actions and inheritance

Only actions defined **on prototype** can be **overridden** by subclass:

```javascript
class Parent {
    // on instance
    arrowAction = () => {}

    // on prototype
    action() {}
    boundAction() {}

    constructor() {
        makeObservable(this, {
            arrowAction: action
            action: action,
            boundAction: action.bound,
        })
    }
}
class Child extends Parent {
    // THROWS: TypeError: Cannot redefine property: arrowAction
    arrowAction = () => {}

    // OK
    action() {}
    boundAction() {}

    constructor() {
        super()
        makeObservable(this, {
            arrowAction: override,
            action: override,
            boundAction: override,
        })
    }
}
```

To **bind** a single _action_ to `this`, `action.bound` can be used instead of _arrow functions_.<br>
See [**subclassing**](subclassing.md) for more information.

## Asynchronous actions

In essence, asynchronous processes don't need any special treatment in MobX, as all reactions will update automatically regardless of the moment in time they are caused.
And since observable objects are mutable, it is generally safe to keep references to them for the duration of an action.
However, every step (tick) that updates observables in an asynchronous process should be marked as `action`.
This can be achieved in multiple ways by leveraging the above APIs, as shown below.

For example, when handling promises, the handlers that update state should be actions or should be wrapped using `action`, as shown below.

<!--DOCUSAURUS_CODE_TABS-->
<!--Wrap handlers in `action`-->

Promise resolution handlers are handled in-line, but run after the original action finished, so they need to be wrapped by `action`:

```javascript
import { action, makeAutoObservable } from "mobx"

class Store {
    githubProjects = []
    state = "pending" // "pending", "done" or "error"

    constructor() {
        makeAutoObservable(this)
    }

    fetchProjects() {
        this.githubProjects = []
        this.state = "pending"
        fetchGithubProjectsSomehow().then(
            action("fetchSuccess", projects => {
                const filteredProjects = somePreprocessing(projects)
                this.githubProjects = filteredProjects
                this.state = "done"
            }),
            action("fetchError", error => {
                this.state = "error"
            })
        )
    }
}
```

<!--Handle updates in separate actions-->

If the promise handlers are class fields, they will automatically be wrapped in `action` by `makeAutoObservable`:

```javascript
import { makeAutoObservable } from "mobx"

class Store {
    githubProjects = []
    state = "pending" // "pending", "done" or "error"

    constructor() {
        makeAutoObservable(this)
    }

    fetchProjects() {
        this.githubProjects = []
        this.state = "pending"
        fetchGithubProjectsSomehow().then(this.projectsFetchSuccess, this.projectsFetchFailure)
    }

    projectsFetchSuccess = projects => {
        const filteredProjects = somePreprocessing(projects)
        this.githubProjects = filteredProjects
        this.state = "done"
    }

    projectsFetchFailure = error => {
        this.state = "error"
    }
}
```

<!--async/await + runInAction-->

Any steps after `await` aren't in the same tick, so they require action wrapping.
Here, we can leverage `runInAction`:

```javascript
import { runInAction, makeAutoObservable } from "mobx"

class Store {
    githubProjects = []
    state = "pending" // "pending", "done" or "error"

    constructor() {
        makeAutoObservable(this)
    }

    async fetchProjects() {
        this.githubProjects = []
        this.state = "pending"
        try {
            const projects = await fetchGithubProjectsSomehow()
            const filteredProjects = somePreprocessing(projects)
            runInAction(() => {
                this.githubProjects = filteredProjects
                this.state = "done"
            })
        } catch (e) {
            runInAction(() => {
                this.state = "error"
            })
        }
    }
}
```

<!--`flow` + generator function -->

```javascript
import { flow, makeAutoObservable, flowResult } from "mobx"

class Store {
    githubProjects = []
    state = "pending"

    constructor() {
        makeAutoObservable(this, {
            fetchProjects: flow
        })
    }

    // Note the star, this a generator function!
    *fetchProjects() {
        this.githubProjects = []
        this.state = "pending"
        try {
            // Yield instead of await.
            const projects = yield fetchGithubProjectsSomehow()
            const filteredProjects = somePreprocessing(projects)
            this.state = "done"
            this.githubProjects = filteredProjects
        } catch (error) {
            this.state = "error"
        }
    }
}

const store = new Store()
const projects = await flowResult(store.fetchProjects())
```

<!--END_DOCUSAURUS_CODE_TABS-->

## Using flow instead of async / await {🚀}

Usage:

-   `flow` _(annotation)_
-   `flow(function* (args) { })`

The `flow` wrapper is an optional alternative to `async` / `await` that makes it easier to
work with MobX actions.
`flow` takes a [generator function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator) as its only input.
Inside the generator, you can chain promises by yielding them (instead of `await somePromise` you write `yield somePromise`).
The flow mechanism will then make sure the generator either continues or throws when a yielded promise resolves.

So `flow` is an alternative to `async` / `await` that doesn't need any further `action` wrapping. It can be applied as follows:

1. Wrap `flow` around your asynchronous function.
2. Instead of `async` use `function *`.
3. Instead of `await` use `yield`.

The [`flow` + generator function](#asynchronous-actions) example above shows what this looks like in practice.

Note that the `flowResult` function is only needed when using TypeScript.
Since decorating a method with `flow`, it will wrap the returned generator in a promise.
However, TypeScript isn't aware of that transformation, so `flowResult` will make sure that TypeScript is aware of that type change.

`makeAutoObservable` and friends will automatically infer generators to be `flow`s. `flow` annotated members will be non-enumerable.

<details id="flow-wrap"><summary>{🚀} **Note:** using flow on object fields<a href="#flow-wrap" class="tip-anchor"></a></summary>
`flow`, like `action`, can be used to wrap functions directly. The above example could also have been written as follows:

```typescript
import { flow } from "mobx"

class Store {
    githubProjects = []
    state = "pending"

    fetchProjects = flow(function* (this: Store) {
        this.githubProjects = []
        this.state = "pending"
        try {
            // yield instead of await.
            const projects = yield fetchGithubProjectsSomehow()
            const filteredProjects = somePreprocessing(projects)
            this.state = "done"
            this.githubProjects = filteredProjects
        } catch (error) {
            this.state = "error"
        }
    })
}

const store = new Store()
const projects = await store.fetchProjects()
```

The upside is that we don't need `flowResult` anymore, the downside is that `this` needs to be typed to make sure its type is inferred correctly.

</details>

## `flow.bound`

Usage:

-   `flow.bound` _(annotation)_

The `flow.bound` annotation can be used to automatically bind a method to the correct instance, so that `this` is always correctly bound inside the function.
Similary to actions, flows can be bound by default using [`autoBind` option](#auto-bind).

## Cancelling flows {🚀}

Another neat benefit of flows is that they are cancellable.
The return value of `flow` is a promise that resolves with the value that is returned from the generator function in the end.
The returned promise has an additional `cancel()` method that will interrupt the running generator and cancel it.
Any `try` / `finally` clauses will still be run.

## Disabling mandatory actions {🚀}

By default, MobX 6 and later require that you use actions to make changes to the state.
However, you can configure MobX to disable this behavior. Check out the [`enforceActions`](configuration.md#enforceactions) section.
For example, this can be quite useful in unit test setup, where the warnings don't always have much value.

---
title: Update state using actions
sidebar_label: Update state using actions
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Update state using actions

## Action

Usage:

-   `action` (annotation)
-   `action(fn)`
-   `action(name, fn)`

Any application has actions. An action is any code block that modifies state.
In principle actions always happen in response to an event. For example a button was clicked, some input did change, a websocket message arrived, etc.
MobX requires that you declare your actions, though [makeAutoObservable](observable.md) can automate much of this job. Actions help you to structure your code better and offer performance benefits:

The `action` annotation should only be used on functions that intend to _modify_ state.
Functions that just perform look-ups, filter data, in short any function that derives information, should _not_ be marked as actions; to allow MobX to track their invocations.

1. Actions are run inside [transactions](api.md#transaction). No observers will be updated until the outer-most action has finished. This ensures that intermediate or incomplete values produced during an action are not visible to the rest of the application until the action has finished.
2. Outside actions it is (by default) not allowed to modify state. This helps to clearly identify in your code base where the state updates happen.

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
        // intermediate states won't become visible to observers
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
import { makeObservable, observable, computed, action } from "mobx"

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
setInterval(doubler.increment, 1000) // calling increment this way is safe as it is bound already
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
import { observable } from "mobx"

const state = observable({ value: 0 })

runInAction(() => {
    state.value++
    state.value++
})
```

<!--END_DOCUSAURUS_CODE_TABS-->

### `action` can wrap functions

To leverage the transactional nature of MobX as much as possible, actions should be passed as far outward as possible. It is good to mark a class method as action if it modifies state. It is even better to mark event handlers as action; as it is the outer-most transaction that counts. A single unmarked event handler that calls two actions subsequently would still generate two transactions.

To help creating action based event handlers, `action` is not only an annotation, but also a higher order function; it can be called with a function as argument and in that case it will return an `action` wrapped function with the same signature.

For example in React an `onClick` handler can be wrapped like:

```javascript
const ResetButton = ({ formState }) => (
    <button
        onClick={action(e => {
            formState.resetPendingUploads()
            formState.resetValues()
            e.stopPropagation()
        })}
    >
        Reset form
    </button>
)
```

For debugging purposes we recommend either name the wrapped function, or pass a name as first argument to `action`.

<div class="detail">

Another feature of actions is that they are [untracked](api.md#untracked); when an action is called from inside a side effect or computed value (a thing that should really rarily be needed!), observables read by the action won't be counted towards the dependencies of the derivation

`makeAutoObservable`, `extendObservable` and `observable` use a special flavour of `action`, `autoAction`
that will determine at runtime if the function is a derivation or action.

</div>

### `action.bound`

Usage:

-   `action.bound` (annotation)

The `action.bound` annotation can be used to automatically bind a method to the correct instance, so that `this` is always correctly bound inside the function.

Tip: If you want to bind actions in combination with `makeAutoObservable`, it is usually simpler to use arrow functions instead:

```javascript
import { makeAutoObservable } from "mobx"

class Doubler {
    value = 0

    constructor(value) {
        makeAutoObservable(this)
    }

    increment = () => {
        this.value++
        this.value++
    }
}
```

### `runInAction`

Usage:

-   `runInAction(fn)`

Use this utility to create a temporarily action that is immediately invoked. Can be useful in asynchronous processes.
See the above code block for an example.

## Asynchronous actions

In essence asynchronous processes don't need any special treatment in MobX, as all reactions will update automatically regardless the moment in time they are caused.
And since observable objects are mutable, it is generally safe to keep references to them during the duration of an action.
However, every step (tick) that updates observables in an asynchronous process should be marked as `action`.
This can be achieved in multiple ways by leveraging the above APIs, as shown below.

For example, when handling promises, the handlers that update state should be wrapped using `action` or be actions, as shown below.

<!--DOCUSAURUS_CODE_TABS-->
<!--Wrap handlers in `action`-->

Promise resolution handlers are handled in-line, but run after the original action finished, so need to be wrapped by `action`:

```javascript
import { action, makeAutoObservable } from "mobx"

class Store {
    githubProjects = []
    state = "pending" // "pending" / "done" / "error"

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
    state = "pending" // "pending" / "done" / "error"

    constructor() {
        makeAutoObservable(this)
    }

    fetchProjects() {
        this.githubProjects = []
        this.state = "pending"
        fetchGithubProjectsSomehow().then(
            this.projectsFetchSuccess,
            this.projectsFetchFailure
        )
    )

    projectsFetchSuccess = (projects) => {
        const filteredProjects = somePreprocessing(projects)
        this.githubProjects = filteredProjects
        this.state = "done"
    }

    projectsFetchFailure = (error) => {
        this.state = "error"
    }
}
```

<!--async/await + runInAction-->

Any steps after `await` aren't in the same tick, so need action wrapping.
We can leverage `runInAction` here:

```javascript
import { runInAction, makeAutoObservable } from "mobx"

class Store {
    githubProjects = []
    state = "pending" // "pending" / "done" / "error"

    constructor() {
        makeAutoObservable(this)
    }

    fetchProjects() {
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
            }
        }
    )
}
```

<!--`flow` + generator function -->

Flow is explained below.

```javascript
import { flow, makeAutoObservable } from "mobx"

class Store {
    githubProjects = []
    state = "pending"

    constructor() {
        makeAutoObservable(this)
    }

    // note the star, this a generator function!
    fetchProjects = flow(function* fetchProjects() {
        this.githubProjects = []
        this.state = "pending"
        try {
            const projects = yield fetchGithubProjectsSomehow() // yield instead of await
            const filteredProjects = somePreprocessing(projects)
            this.state = "done"
            this.githubProjects = filteredProjects
        } catch (error) {
            this.state = "error"
        }
    })
}
```

<!--END_DOCUSAURUS_CODE_TABS-->

## Using flow instead of async/await

Usage:

-   `flow(function* (args) { })`

The `flow` wrapper is an alternative to `async` / `await` that makes it more easy to
work with MobX actions.
`flow()` takes a [generator function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator) as its only input.
Inside the generator you can chain promises by yielding them (so instead of `await somePromise` you write `yield somePromise`).
The flow mechanism than will make sure the generator continues or throws when the promise resolves.
However, the code that is executed when continuing will automatically be wrapped in action.
So `flow` is an alternative to `async / await` that doesn't need any further action wrapping.
It can be applied as follows:

1. Wrap `flow` around your asynchronous function.
2. Instead of `async` you use `function *`.
3. Instead of `await` you use `yield`.

The listing above shows what this looks in practice.

### Flow cancellation

Another neat benefit of flows is that they are cancellable.
The return value of `flow` is a promise that resolves with the value that is returned from the generator function in the end.
The returned promise has an additional `cancel()` methods that will interrupt the running generator and cancel it.
Any `try / finally` clauses will still be run.

## Disabling mandatory actions

By default, MobX 6 and later require that you use actions to make state changes.
You can however configure MobX to disable this behavior, see [`enforceActions`](configure.md#enforceactions).
This can be quite useful in for example unit test setup, where the warnings don't always have much value.

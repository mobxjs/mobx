---
sidebar_label: Asynchronous actions
title: Asynchronous actions
hide_title: true
---

# Asynchronous actions

If you wrap a function in `action` or mark it as such with `makeObservable`,
this only affects the currently running function, not functions that are scheduled (but not invoked) by the current function!

This means that if you have a `setTimeout`, promise`.then` or `async` construction, and in that callback some more state is changed, those callbacks should be wrapped in `action` as well! There are several ways to create asynchronous actions. No approach is strictly better than the other, but this section just list different approaches you can take to writing asynchronous code.

## Promises

This code **won't work**:

```javascript
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
            projects => {
                const filteredProjects = somePreprocessing(projects)
                this.githubProjects = filteredProjects
                this.state = "done"
            },
            error => {
                this.state = "error"
            }
        )
    }
}
```

The above example would throw exceptions, as the arrow functions that are passed to the `fetchGithubProjectsSomehow` promise are not part of the `fetchProjects` action.

We discuss various alternative approaches below to make it work again: separating
out action methods, wrapping callbacks with `action` and `runInAction`.

### Separate methods

A first simple fix is to extract the behavior inside the callback functions as action methods and call them:

```javascript
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
            projects => {
                this.fetchProjectsSuccess(projects)
            },
            error => {
                this.fetchProjectsError(error)
            }
        )
    }

    fetchProjectsSuccess(projects) {
        const filteredProjects = somePreprocessing(projects)
        this.githubProjects = filteredProjects
        this.state = "done"
    }

    fetchProjectsError(error) {
        this.state = "error"
    }
}
```

Note that you still have to use arrow functions as callbacks to ensure the right binding, i.e. you cannot just write:

`then(this.fetchProjectsSuccess, this.fetchProjectsError)`

To be able to write the code like this, you first need to bind the actions, either by using [bound arrow functions](../refguide/action.md#bound-arrow-functions) or by explicitly marking the actions with [`action.bound`](../refguide/action.md#actionbound).

### Wrap callbacks with `action`

Although the approach above is clean and explicit, it might get a bit verbose with complex async flows. As an alternative you can wrap the promise callbacks with the [`action` function](../refguide/action.md). It is recommended, but not mandatory, to give them a name as well:

```javascript
import { action } from "mobx"

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
            // inline created action
            action("fetchSuccess", projects => {
                const filteredProjects = somePreprocessing(projects)
                this.githubProjects = filteredProjects
                this.state = "done"
            }),
            // inline created action
            action("fetchError", error => {
                this.state = "error"
            })
        )
    }
}
```

### The `runInAction` utility

Instead of creating an action for the entire callback, you can also run only the state modifying part of the callback in an action with `runInAction`. This is especially useful with TypeScript, as you can avoid having to manually type your callbacks.

`runInAction` requires you to structure your code so that state modifications happen at the end of the process as much as possible:

```javascript
import { runInAction } from "mobx"

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
            projects => {
                const filteredProjects = somePreprocessing(projects)
                // put the 'final' modification in an anonymous action
                runInAction(() => {
                    this.githubProjects = filteredProjects
                    this.state = "done"
                })
            },
            error => {
                // the alternative ending of this process:...
                runInAction(() => {
                    this.state = "error"
                })
            }
        )
    }
}
```

See also [`runInAction`](../refguide/action.md#runinaction).

## async / await

Async / await based functions can initially seem confusing when you use them with
actions. Because they appear to be synchronous functions, you get the impression that `action` applies to the entire function. Unfortunately this is not the case, as `async` / `await` is just syntactic sugar around a promise based process.

As a result, `action` only applies to the code block until the first `await`.
And after each `await` a new asynchronous function is started, so after each `await`, state modifying code should be wrapped as action.

So this code **won't work**:

```javascript
import { runInAction } from "mobx"

class Store {
    githubProjects = []
    state = "pending" // "pending" / "done" / "error"

    constructor() {
        makeAutoObservable(this)
    }

    async fetchProjects() {
        this.githubProjects = []
        this.state = "pending"
        try {
            const projects = await fetchGithubProjectsSomehow()
            const filteredProjects = somePreprocessing(projects)
            this.state = "done"
            this.githubProjects = filteredProjects
        } catch (error) {
            this.state = "error"
        }
    }
}
```

This code throws exceptions. We discuss various alternative approaches below to make it work again: separating out action methods, and `runInAction`. As an alternative
to `async` / `await` you can also use MobX's built-in replacement, `flow`.

### Separate methods

You can work around this in the same way as with promises -- call
another separate method that is an action after "await":

```javascript
class Store {
    githubProjects = []
    state = "pending" // "pending" / "done" / "error"

    constructor() {
        makeAutoObservable(this)
    }

    async fetchProjects() {
        this.githubProjects = []
        this.state = "pending"
        try {
            const projects = await fetchGithubProjectsSomehow()
            this.fetchProjectsSuccess(projects)
        } catch (error) {
            this.fetchProjectsError(error)
        }
    }

    fetchProjectsSuccess(projects) {
        const filteredProjects = somePreprocessing(projects)
        this.githubProjects = filteredProjects
        this.state = "done"
    }

    fetchProjectsError(error) {
        this.state = "error"
    }
}
```

### runInAction again

More more complicated async flow, you could instead use the `runInAction`
utility:

```javascript
import { runInAction } from "mobx"

class Store {
    githubProjects = []
    state = "pending" // "pending" / "done" / "error"

    constructor() {
        makeAutoObservable(this)
    }

    async fetchProjects() {
        this.githubProjects = []
        this.state = "pending"
        try {
            const projects = await fetchGithubProjectsSomehow()
            const filteredProjects = somePreprocessing(projects)
            // after await, modifying state again, needs an actions:
            runInAction(() => {
                this.state = "done"
                this.githubProjects = filteredProjects
            })
        } catch (error) {
            runInAction(() => {
                this.state = "error"
            })
        }
    }
}
```

## flow instead of async/await

An alternative approach is to use the built-in concept of [`flow`](../refguide/flow.md). `flow` works in the same way as `async` / `await` but is based around generators instead. The rules are:

-   Wrap `flow` around your asynchronous function.

-   Instead of `async` you use `function *`

-   Instead of `await` you use `yield`.

The advantage of `flow` is that it is syntactically very close to `async` / `await` (with different keywords), and no manually action wrapping is required for async parts.

`flow` also integrates neatly with MobX development tools, so that it is easy to trace the process of the async function.

Here is our example rewritten to use `flow`:

```javascript
import { flow } from "mobx"

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
            // the asynchronous blocks will automatically be wrapped in actions and can modify state
            this.state = "done"
            this.githubProjects = filteredProjects
        } catch (error) {
            this.state = "error"
        }
    })
}
```

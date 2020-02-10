---
sidebar_label: async actions & flows
title: Writing asynchronous actions
hide_title: true
---

# Writing asynchronous actions

<div id='codefund'></div><div class="re_2020"><a class="re_2020_link" href="https://www.react-europe.org/#slot-2149-workshop-typescript-for-react-and-graphql-devs-with-michel-weststrate" target="_blank" rel="sponsored noopener"><div><div class="re_2020_ad" >Ad</div></div><img src="/img/reacteurope.svg"><span>Join the author of MobX at <b>ReactEurope</b> to learn how to use <span class="link">TypeScript with React</span></span></a></div>

The `action` wrapper / decorator only affects the currently running function, not functions that are scheduled (but not invoked) by the current function!
This means that if you have a `setTimeout`, promise`.then` or `async` construction, and in that callback some more state is changed, those callbacks should be wrapped in `action` as well! There are several ways to create asynchronous actions. No approach is strictly better than the other, but this section just list different approaches you can take to writing asynchronous code.
Let's start with a basic example:

### Promises

```javascript
mobx.configure({ enforceActions: "observed" }) // don't allow state modifications outside actions

class Store {
    @observable githubProjects = []
    @observable state = "pending" // "pending" / "done" / "error"

    @action
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

The above example would throw exceptions, as the callbacks passed to the `fetchGithubProjectsSomehow` promise are not part of the `fetchProjects` action, as actions only apply to the current stack.

A first simple fix is to extract the callbacks to actions. (Note that binding using `action.bound` is important here to get a correct `this`!):

```javascript
mobx.configure({ enforceActions: "observed" })

class Store {
    @observable githubProjects = []
    @observable state = "pending" // "pending" / "done" / "error"

    @action
    fetchProjects() {
        this.githubProjects = []
        this.state = "pending"
        fetchGithubProjectsSomehow().then(this.fetchProjectsSuccess, this.fetchProjectsError)
    }

    @action.bound
    fetchProjectsSuccess(projects) {
        const filteredProjects = somePreprocessing(projects)
        this.githubProjects = filteredProjects
        this.state = "done"
    }

    @action.bound
    fetchProjectsError(error) {
        this.state = "error"
    }
}
```

Although this is clean and explicit, it might get a bit verbose with complex async flows. Alternative, you can wrap the promise callbacks with the `action` keyword. It is recommended, but not mandatory, to give them a name as well:

```javascript
mobx.configure({ enforceActions: "observed" })

class Store {
    @observable githubProjects = []
    @observable state = "pending" // "pending" / "done" / "error"

    @action
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

A downside of inline actions is that TypeScript does not apply type inference on them, so you would have type all your callbacks.
Instead of creating an action for the entire callback, you can also run only the state modifying part of the callback in an action.
The advantage of this pattern is that it encourages you to not litter the place with `action`, but rather put all the state modifications as much as possible at the end of the whole process:

```javascript
mobx.configure({ enforceActions: "observed" })

class Store {
    @observable githubProjects = []
    @observable state = "pending" // "pending" / "done" / "error"

    @action
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

Note that `runInAction`'s can also be given a name as first argument. `runInAction(f)` is in fact just sugar for `action(f)()`

### async / await

Async / await based functions can initially seem confusing when starting with actions.
Because lexically they appear to synchronous functions, it gives the impression that `@action` applies to the entire function.
Which is of course not the case, as async / await is just syntactic sugar around a promise based process.
As a result, `@action` only applies to the code block until the first `await`.
And after each `await` a new asynchronous function is started, so after each `await`, state modifying code should be wrapped as action.
This is where `runInAction` comes in handy again:

```javascript
mobx.configure({ enforceActions: "observed" })

class Store {
    @observable githubProjects = []
    @observable state = "pending" // "pending" / "done" / "error"

    @action
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

### flows

However, a nicer approach is to use the built-in concept of `flow`s. They use generators. Which might look scary in the beginning, but it works the same as `async` / `await`. Just use `function *` instead of `async` and `yield` instead of `await`.
The advantage of `flow` is that it is syntactically very close to async / await (with different keywords), and no manually action wrapping is needed for async parts, resulting in very clean code.

`flow` can be used only as function and not as decorator.
`flow` integrates neatly with MobX development tools, so that it is easy to trace the process of the async function.

```javascript
mobx.configure({ enforceActions: "observed" })

class Store {
    @observable githubProjects = []
    @observable state = "pending"

    fetchProjects = flow(function*() {
        // <- note the star, this a generator function!
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

#### Flows can be cancelled

Flows are cancellable, that means that you can call `cancel()` on the returned promise. This will stop the generator immediately, but any finally clause will still be processed. The returned promise itself will reject with an instance of `FlowCancellationError` (this error is exported from the package) whose message is `FLOW_CANCELLED`. Also exported is a `isFlowCancellationError(error)` helper that returns true if and only if the provided argument is a `FlowCancellationError`.

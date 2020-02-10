---
sidebar_label: Defining data stores
title: Best Practices for building large scale maintainable projects
hide_title: true
---

# Best Practices for building large scale maintainable projects

<div id='codefund'></div><div class="re_2020"><a class="re_2020_link" href="https://www.react-europe.org/#slot-2149-workshop-typescript-for-react-and-graphql-devs-with-michel-weststrate" target="_blank" rel="sponsored noopener"><div><div class="re_2020_ad" >Ad</div></div><img src="/img/reacteurope.svg"><span>Join the author of MobX at <b>ReactEurope</b> to learn how to use <span class="link">TypeScript with React</span></span></a></div>

This section contains some best practices we discovered at Mendix while working with MobX.
This section is opinionated and you are in no way forced to apply these practices.
There are many ways of working with MobX and React, and this is just one of them.

This section focuses on an unobtrusive way of working with MobX, which works well in existing code bases, or with classic MVC patterns. An alternative, more opinionated way of organizing stores is using [mobx-state-tree](https://github.com/mobxjs/mobx-state-tree), which ships with cool features as structurally shared snapshots, action middlewares, JSON patch support etc out of the box.

# Stores

Stores can be found in any Flux architecture and can be compared a bit with controllers in the MVC pattern.
The main responsibility of stores is to move _logic_ and _state_ out of your components into a standalone testable unit that can be used in both frontend and backend JavaScript.

## Stores for the user interface state

Most applications benefit from having at least two stores.
One for the _UI state_ and one or more for the _domain state_.
The advantage of separating those two is you can reuse and test _domain state_ universally, and you might very well reuse it in other applications.
The _ui-state-store_ however is often very specific for your application.
But usually very simple as well.
This store typically doesn't have much logic in it, but will store a plethora of loosely coupled pieces of information about the UI.
This is ideal as most applications will change the UI state often during the development process.

Things you will typically find in UI stores:

-   Session information
-   Information about how far your application has loaded
-   Information that will not be stored in the backend
-   Information that affects the UI globally
    -   Window dimensions
    -   Accessibility information
    -   Current language
    -   Currently active theme
-   User interface state as soon as it affects multiple, further unrelated components:
    -   Current selection
    -   Visibility of toolbars, etc.
    -   State of a wizard
    -   State of a global overlay

It might very well be that these pieces of information start as internal state of a specific component (for example the visibility of a toolbar).
But after a while you discover that you need this information somewhere else in your application.
Instead of pushing state in such a case upwards in the component tree, like you would do in plain React apps, you just move that state to the _ui-state-store_.

For isomorphic applications you might also want to provide a stub implementation of this store with sane defaults so that all components render as expected.
You might distribute the _ui-state-store_ through your application by passing it as a property through your component tree or using `Provider` and `inject` from the `mobx-react` package.

Example of a store (using ES6 syntax):

```javascript
import { observable, computed, asStructure } from "mobx"
import jquery from "jquery"

export class UiState {
    @observable language = "en_US"
    @observable pendingRequestCount = 0

    // .struct makes sure observer won't be signaled unless the
    // dimensions object changed in a deepEqual manner
    @observable.struct windowDimensions = {
        width: jquery(window).width(),
        height: jquery(window).height()
    }

    constructor() {
        jquery.resize(() => {
            this.windowDimensions = getWindowDimensions()
        })
    }

    @computed get appIsInSync() {
        return this.pendingRequestCount === 0
    }
}
```

## Domain Stores

Your application will contain one or multiple _domain_ stores.
These stores store the data your application is all about.
Todo items, users, books, movies, orders, you name it.
Your application will most probably have at least one domain store.

A single domain store should be responsible for a single concept in your application.
However a single concept might take the form of multiple subtypes and it is often a (cyclic) tree structure.
For example: one domain store for your products, and one for your orders and orderlines.
As a rule of thumb: if the nature of the relationship between two items is containment, they should typically be in the same store.
So a store just manages _domain objects_.

These are the responsibilities of a store:

-   Instantiate domain objects. Make sure domain objects know the store they belong to.
-   Make sure there is only one instance of each of your domain objects.
    The same user, order or todo should not be stored twice in memory.
    This way you can safely use references and also be sure you are looking at the latest instance, without ever having to resolve a reference.
    This is fast, straightforward and convenient when debugging.
-   Provide backend integration. Store data when needed.
-   Update existing instances if updates are received from the backend.
-   Provide a stand-alone, universal, testable component of your application.
-   To make sure your store is testable and can be run server-side, you probably will move doing actual websocket / http requests to a separate object so that you can abstract over your communication layer.
-   There should be only one instance of a store.

### Domain objects

Each domain object should be expressed using its own class (or constructor function).
It is recommended to store your data in _denormalized_ form.
There is no need to treat your client-side application state as some kind of database.
Real references, cyclic data structures and instance methods are powerful concepts in JavaScript.
Domain objects are allowed to refer directly to domain objects from other stores.
Remember: we want to keep our actions and views as simple as possible and needing to manage references and doing garbage collection yourself might be a step backward.
Unlike many Flux architectures, with MobX there is no need to normalize your data, and this makes it a lot simpler to build the _essentially_ complex parts of your application:
your business rules, actions and user interface.

Domain objects can delegate all their logic to the store they belong to if that suits your application well.
It is possible to express your domain objects as plain objects, but classes have some important advantages over plain objects:

-   They can have methods.
    This makes your domain concepts easier to use stand-alone and reduces the amount of contextual awareness that is needed in your application.
    Just pass objects around.
    You don't have to pass stores around, or have to figure out which actions can be applied to an object if they are just available as instance methods.
    Especially in large applications this is important.
-   They offer fine grained control over the visibility of attributes and methods.
-   Objects created using a constructor function can freely mix observable properties and functions, and non-observable properties and methods.
-   They are easily recognizable and can strictly be type-checked.

### Example domain store

```javascript
import { observable, autorun } from "mobx"
import uuid from "node-uuid"

export class TodoStore {
    authorStore
    transportLayer
    @observable todos = []
    @observable isLoading = true

    constructor(transportLayer, authorStore) {
        this.authorStore = authorStore // Store that can resolve authors for us
        this.transportLayer = transportLayer // Thing that can make server requests for us
        this.transportLayer.onReceiveTodoUpdate(updatedTodo =>
            this.updateTodoFromServer(updatedTodo)
        )
        this.loadTodos()
    }

    /**
     * Fetches all todos from the server
     */
    loadTodos() {
        this.isLoading = true
        this.transportLayer.fetchTodos().then(fetchedTodos => {
            fetchedTodos.forEach(json => this.updateTodoFromServer(json))
            this.isLoading = false
        })
    }

    /**
     * Update a todo with information from the server. Guarantees a todo
     * only exists once. Might either construct a new todo, update an existing one,
     * or remove a todo if it has been deleted on the server.
     */
    updateTodoFromServer(json) {
        var todo = this.todos.find(todo => todo.id === json.id)
        if (!todo) {
            todo = new Todo(this, json.id)
            this.todos.push(todo)
        }
        if (json.isDeleted) {
            this.removeTodo(todo)
        } else {
            todo.updateFromJson(json)
        }
    }

    /**
     * Creates a fresh todo on the client and server
     */
    createTodo() {
        var todo = new Todo(this)
        this.todos.push(todo)
        return todo
    }

    /**
     * A todo was somehow deleted, clean it from the client memory
     */
    removeTodo(todo) {
        this.todos.splice(this.todos.indexOf(todo), 1)
        todo.dispose()
    }
}

export class Todo {
    /**
     * unique id of this todo, immutable.
     */
    id = null

    @observable completed = false
    @observable task = ""

    /**
     * reference to an Author object (from the authorStore)
     */
    @observable author = null

    store = null

    /**
     * Indicates whether changes in this object
     * should be submitted to the server
     */
    autoSave = true

    /**
     * Disposer for the side effect that automatically
     * stores this Todo, see @dispose.
     */
    saveHandler = null

    constructor(store, id = uuid.v4()) {
        this.store = store
        this.id = id

        this.saveHandler = reaction(
            // observe everything that is used in the JSON:
            () => this.asJson,
            // if autoSave is on, send json to server
            json => {
                if (this.autoSave) {
                    this.store.transportLayer.saveTodo(json)
                }
            }
        )
    }

    /**
     * Remove this todo from the client and server
     */
    delete() {
        this.store.transportLayer.deleteTodo(this.id)
        this.store.removeTodo(this)
    }

    @computed get asJson() {
        return {
            id: this.id,
            completed: this.completed,
            task: this.task,
            authorId: this.author ? this.author.id : null
        }
    }

    /**
     * Update this todo with information from the server
     */
    updateFromJson(json) {
        // make sure our changes aren't sent back to the server
        this.autoSave = false
        this.completed = json.completed
        this.task = json.task
        this.author = this.store.authorStore.resolveAuthor(json.authorId)
        this.autoSave = true
    }

    dispose() {
        // clean up the observer
        this.saveHandler()
    }
}
```

# Combining multiple stores

An often asked question is how to combine multiple stores without using singletons. How will they know about each other?

An effective pattern is to create a `RootStore` that instantiates all stores, and share references. The advantage of this pattern is:

1. Simple to set up.
2. Supports strong typing well.
3. Makes complex unit tests easy as you just have to instantiate a root store.

Example:

```javascript
class RootStore {
    constructor() {
        this.userStore = new UserStore(this)
        this.todoStore = new TodoStore(this)
    }
}

class UserStore {
    constructor(rootStore) {
        this.rootStore = rootStore
    }

    getTodos(user) {
        // access todoStore through the root store
        return this.rootStore.todoStore.todos.filter(todo => todo.author === user)
    }
}

class TodoStore {
    @observable todos = []

    constructor(rootStore) {
        this.rootStore = rootStore
    }
}
```

When using React, this root store is typically inserted into the component tree by using `<Provider rootStore={new RootStore()}><App /></Provider>`

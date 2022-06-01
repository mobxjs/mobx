---
title: Defining data stores
sidebar_label: Defining data stores
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Defining data stores

This section contains some of the best practices for building large scale maintainable projects we discovered at Mendix while working with MobX.
This section is opinionated and you are in no way forced to apply these practices.
There are many ways of working with MobX and React, and this is just one of them.

This section focuses on an unobtrusive way of working with MobX, which works well in existing codebases, or with classic MVC patterns. Alternative, more opinionated ways of organizing stores are [mobx-state-tree](https://github.com/mobxjs/mobx-state-tree) and [mobx-keystone](https://mobx-keystone.js.org/). Both ship with cool features such as structurally shared snapshots, action middlewares, JSON patch support etc. out of the box.

## Stores

Stores can be found in any Flux architecture and can be compared a bit with controllers in the MVC pattern.
The main responsibility of stores is to move _logic_ and _state_ out of your components into a standalone testable unit that can be used in both frontend and backend JavaScript.

Most applications benefit from having at least two stores: one for the _domain state_ and another one for the _UI state_. The advantage of separating those two is you can reuse and test _domain state_ universally, and you might very well reuse it in other applications.

## Domain Stores

Your application will contain one or multiple _domain_ stores.
These stores store the data your application is all about.
Todo items, users, books, movies, orders, you name it.
Your application will most probably have at least one domain store.

A single domain store should be responsible for a single concept in your application. A single store is often organized as a tree structure with
multiple domain objects inside.

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
-   Provide a standalone, universal, testable component of your application.
-   To make sure your store is testable and can be run server-side, you will probably move doing actual websocket / http requests to a separate object so that you can abstract over your communication layer.
-   There should be only one instance of a store.

### Domain objects

Each domain object should be expressed using its own class (or constructor function).
There is no need to treat your client-side application state as some kind of database.
Real references, cyclic data structures and instance methods are powerful concepts in JavaScript.
Domain objects are allowed to refer directly to domain objects from other stores.
Remember: we want to keep our actions and views as simple as possible and needing to manage references and doing garbage collection yourself might be a step backward.
Unlike many Flux architectures such as Redux, with MobX there is no need to normalize your data, and this makes it a lot simpler to build the _essentially_ complex parts of your application:
your business rules, actions and user interface.

Domain objects can delegate all their logic to the store they belong to if that suits your application well.
It is possible to express your domain objects as plain objects, but classes have some important advantages over plain objects:

-   They can have methods.
    This makes your domain concepts easier to use standalone and reduces the amount of contextual awareness that is needed in your application.
    Just pass objects around.
    You don't have to pass stores around, or have to figure out which actions can be applied to an object if they are just available as instance methods.
    This is especially important in large applications.
-   They offer fine grained control over the visibility of attributes and methods.
-   Objects created using a constructor function can freely mix observable properties and methods, and non-observable properties and methods.
-   They are easily recognizable and can be strictly type-checked.

### Example domain store

```javascript
import { makeAutoObservable, runInAction, reaction } from "mobx"
import uuid from "node-uuid"

export class TodoStore {
    authorStore
    transportLayer
    todos = []
    isLoading = true

    constructor(transportLayer, authorStore) {
        makeAutoObservable(this)
        this.authorStore = authorStore // Store that can resolve authors.
        this.transportLayer = transportLayer // Thing that can make server requests.
        this.transportLayer.onReceiveTodoUpdate(updatedTodo =>
            this.updateTodoFromServer(updatedTodo)
        )
        this.loadTodos()
    }

    // Fetches all Todos from the server.
    loadTodos() {
        this.isLoading = true
        this.transportLayer.fetchTodos().then(fetchedTodos => {
            runInAction(() => {
                fetchedTodos.forEach(json => this.updateTodoFromServer(json))
                this.isLoading = false
            })
        })
    }

    // Update a Todo with information from the server. Guarantees a Todo only
    // exists once. Might either construct a new Todo, update an existing one,
    // or remove a Todo if it has been deleted on the server.
    updateTodoFromServer(json) {
        let todo = this.todos.find(todo => todo.id === json.id)
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

    // Creates a fresh Todo on the client and the server.
    createTodo() {
        const todo = new Todo(this)
        this.todos.push(todo)
        return todo
    }

    // A Todo was somehow deleted, clean it from the client memory.
    removeTodo(todo) {
        this.todos.splice(this.todos.indexOf(todo), 1)
        todo.dispose()
    }
}

// Domain object Todo.
export class Todo {
    id = null // Unique id of this Todo, immutable.
    completed = false
    task = ""
    author = null // Reference to an Author object (from the authorStore).
    store = null
    autoSave = true // Indicator for submitting changes in this Todo to the server.
    saveHandler = null // Disposer of the side effect auto-saving this Todo (dispose).

    constructor(store, id = uuid.v4()) {
        makeAutoObservable(this, {
            id: false,
            store: false,
            autoSave: false,
            saveHandler: false,
            dispose: false
        })
        this.store = store
        this.id = id

        this.saveHandler = reaction(
            () => this.asJson, // Observe everything that is used in the JSON.
            json => {
                // If autoSave is true, send JSON to the server.
                if (this.autoSave) {
                    this.store.transportLayer.saveTodo(json)
                }
            }
        )
    }

    // Remove this Todo from the client and the server.
    delete() {
        this.store.transportLayer.deleteTodo(this.id)
        this.store.removeTodo(this)
    }

    get asJson() {
        return {
            id: this.id,
            completed: this.completed,
            task: this.task,
            authorId: this.author ? this.author.id : null
        }
    }

    // Update this Todo with information from the server.
    updateFromJson(json) {
        this.autoSave = false // Prevent sending of our changes back to the server.
        this.completed = json.completed
        this.task = json.task
        this.author = this.store.authorStore.resolveAuthor(json.authorId)
        this.autoSave = true
    }

    // Clean up the observer.
    dispose() {
        this.saveHandler()
    }
}
```

## UI stores

The _ui-state-store_ is often very specific for your application, but usually very simple as well.
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

It might very well be that these pieces of information start as internal state of a specific component (for example the visibility of a toolbar), but after a while you discover that you need this information somewhere else in your application.
Instead of pushing state in such a case upwards in the component tree, like you would do in plain React apps, you just move that state to the _ui-state-store_.

For isomorphic applications you might also want to provide a stub implementation of this store with sane defaults so that all components render as expected.
You might distribute the _ui-state-store_ through your application by passing it as React context.

Example of a store (using ES6 syntax):

```javascript
import { makeAutoObservable, observable, computed } from "mobx"

export class UiState {
    language = "en_US"
    pendingRequestCount = 0

    // .struct makes sure observer won't be signaled unless the
    // dimensions object changed in a deepEqual manner.
    windowDimensions = {
        width: window.innerWidth,
        height: window.innerHeight
    }

    constructor() {
        makeAutoObservable(this, { windowDimensions: observable.struct })
        window.onresize = () => {
            this.windowDimensions = getWindowDimensions()
        }
    }

    get appIsInSync() {
        return this.pendingRequestCount === 0
    }
}
```

## Combining multiple stores

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
        // Access todoStore through the root store.
        return this.rootStore.todoStore.todos.filter(todo => todo.author === user)
    }
}

class TodoStore {
    todos = []
    rootStore

    constructor(rootStore) {
        makeAutoObservable(this, { rootStore: false })
        this.rootStore = rootStore
    }
}
```

When using React, this root store is typically inserted into the component tree by using React context.

---
title: The gist of MobX
sidebar_label: The gist of MobX
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# The gist of MobX

## Concepts

MobX distinguishes the following three concepts in your application:

1. State
2. Actions
3. Derivations

Let's take a closer look at these concepts. Or, alternatively, in the [10 minute introduction to MobX and React](https://mobx.js.org/getting-started) you can interactively dive deeper into these concepts step by step and build a simple Todo list app using [React](https://facebook.github.io/react/) around it.

### 1. Define state and make it observable

_State_ is the data that drives your application.
Usually there is _domain specific state_ like a list of todo items and there is _view state_ such as the currently selected element.
State is like spreadsheets cells that hold a value.

Store state in any data structure you like; plain objects, array, classes, cyclic data structures, references, it doesn't matter for the workings of MobX.
Just make sure that all properties that you want to change over time are marked `observable` so that MobX can track them. Here is a simple example:

```javascript
import { makeObservable, observable, action } from "mobx"

class Todo {
    id = Math.random()
    title = ""
    finished = false

    constructor(title) {
        makeObservable(this, {
            title: observable,
            finished: observable,
            toggle: action
        })
        this.title = title
    }

    toggle() {
        this.finished = !this.finished
    }
}
```

(Tip: this example could be shortened by using [`makeAutoObservable`](../refguide/observable.md) instead, but by being explicit we can show the different concepts in detail)

Using `observable` is like turning a property of an object into a spreadsheet cell.
But unlike spreadsheets, these values can be not only primitive values, but also references, objects and arrays.

But what about `toggle`, which we marked `action`?

### 2. Update state using actions

An _action_ is any piece of code that changes the _state_. User events, backend data pushes, scheduled events, etc.
An action is like a user that enters a new value into a spreadsheet cell.

In the `Todo` model you can see that we have a method `toggle` that changes the value of `finished`. `finished` is marked as `observable`. MobX recommends that you mark any code that changes `observable`s as [`action`](../refguide/action.md), so that MobX can automatically apply transactions for optimal performance.

Using actions helps you to structure your code and prevents from inadvertently changing state when you don't want to.
Methods that modify state are called _actions_ in MobX terminology. In contrast to _views_ which compute new information based on the current state.
Every method should serve at most one of those two goals.

### 3. Create derivations that automatically respond to state changes

_Anything_ that can be derived from the _state_ without any further interaction is a derivation.
Derivations exist in many forms:

-   The _user interface_.
-   _Derived data_, such as the number of `todos` left.
-   _Backend integrations_ like sending changes to the server.

MobX distinguishes two kind of derivations:

-   _Computed values_. These are values that can always be derived from the current observable state using a pure function.
-   _Reactions_. Reactions are side effects that need to happen automatically if the state changes. These are needed as a bridge between imperative and reactive programming. Or to make it more clear, they are ultimately needed to achieve I/O.

People starting with MobX tend to use reactions too often.
The golden rule is: if you want to create a value based on the current state, use `computed`.

#### 3.1. Model derived values using computed

You created a computed value by defining a property using a JS getter function (`get`) and then marking it with `computed` with `makeObservable`.

```javascript
import { makeObservable, observable, computed } from "mobx"

class TodoList {
    todos = []
    get unfinishedTodoCount() {
        return this.todos.filter(todo => !todo.finished).length
    }
    constructor() {
        makeObservable(this, {
            todos: observable,
            unfinishedTodoCount: computed
        })
    }
}
```

MobX will ensure that `unfinishedTodoCount` is updated automatically when a todo is added or when one of the `finished` properties is modified.

Computations like these resemble formulas in spreadsheet programs like MS Excel. They update automatically, but only when required. That is, if something is interested in their outcome.

#### 3.2. Model side effects using reactions

For you as a user to be able to see a change in state or computed values on the screen a _reaction_ is needed that repaints part of the GUI.

Reactions are similar to computed values, but instead of producing information, reactions produces side effect like printing to the console, making network requests, incrementally updating the React component tree to patch the DOM, etc.
In short, reactions bridge the worlds of [reactive](https://en.wikipedia.org/wiki/Reactive_programming) and [imperative](https://en.wikipedia.org/wiki/Imperative_programming) programming.

By far the most used form of reactions are UI components.

#### 3.3. Reactive React components

If you are using React, you can turn your components into reactive components by wrapping them with the [`observer`](http://mobxjs.github.io/mobx/react/react-integration.html) function from the `mobx-react-lite` package.

```javascript
import * as React from "react"
import { render } from "react-dom"
import { observer } from "mobx-react-lite"

const TodoListView = observer(({ todoList }) => (
    <div>
        <ul>
            {todoList.todos.map(todo => (
                <TodoView todo={todo} key={todo.id} />
            ))}
        </ul>
        Tasks left: {todoList.unfinishedTodoCount}
    </div>
))

const TodoView = observer(({ todo }) => (
    <li>
        <input type="checkbox" checked={todo.finished} onClick={() => todo.toggle()} />
        {todo.title}
    </li>
))

const store = new TodoList([new Todo("Get Coffee"), new Todo("Write simpler code")])
render(<TodoListView todoList={store} />, document.getElementById("root"))
```

`observer` converts React components into derivations of the data they render.
When using MobX there are no smart or dumb components.
All components render smartly but are defined in a dumb manner. MobX will simply make sure the components are always re-rendered whenever needed, and never more than that.

So the `onClick` handler in the above example will force the proper `TodoView` to render as it uses the `toggle` action, but will only cause the `TodoListView` to render if the number of unfinished tasks has changed.
And if you would remove the `Tasks left` line (or put that into a separate component), the `TodoListView` will no longer re-render when ticking a task.

To learn more about how React works with MobX, read [React integration](../react/react-integration.md).

#### 3.4. Custom reactions

You will need them rarely, but custom reactions can simply be created using the [`autorun`](../refguide/autorun.md),
[`reaction`](../refguide/reaction.md) or [`when`](../refguide/when.md) functions to fit your specific situations.
For example the following `autorun` prints a log message each time the amount of `unfinishedTodoCount` changes:

```javascript
/* a function that automatically observes the state */
autorun(() => {
    console.log("Tasks left: " + todos.unfinishedTodoCount)
})
```

Why does a new message get printed each time the `unfinishedTodoCount` is changed? The answer is this rule of thumb:

_MobX reacts to any existing observable property that is read during the execution of a tracked function._

For an in-depth explanation about how MobX determines to which observables needs to be reacted, check [understanding what MobX reacts to](../best/what-does-mobx-react-to.md).

## Principles

MobX supports a uni-directional data flow where _actions_ change the _state_, which in turn updates all affected _views_.

![Action, State, View](../assets/action-state-view.png)

All _Derivations_ are updated **automatically** and **atomically** when the _state_ changes. As a result it is never possible to observe intermediate values.

All _Derivations_ are updated **synchronously** by default. This means that, for example, _actions_ can safely inspect a computed value directly after altering the _state_.

_Computed values_ are updated **lazily**. Any computed value that is not actively in use will not be updated until it is needed for a side effect (I/O).
If a view is no longer in use it will be garbage collected automatically.

All _Computed values_ should be **pure**. They are not supposed to change _state_.

## Try it out!

You can play with the above yourself on [CodeSandbox](https://codesandbox.io/s/concepts-principles-il8lt?file=/src/index.js:1161-1252).

## Linting

If you find it hard to adopt the mental model of MobX, MobX can be configured to be very strict and warn at run-time whenever you deviate from these patterns. See [linting MobX](../refguide/configure.md#linting-options).

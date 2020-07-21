---
sidebar_label: Concepts & Principles
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Concepts & Principles

## Concepts

MobX distinguishes the following concepts in your application.

We show example code to illustrate these concepts. For clarity we don't use the convenience function `makeAutoObservable` yet in this code.

In the [10 minute introduction to MobX and React](https://mobx.js.org/getting-started) you can dive deeper into this example and build a user interface using [React](https://facebook.github.io/react/) around it.

### 1. State

_State_ is the data that drives your application.
Usually there is _domain specific state_ like a list of todo items and there is _view state_ such as the currently selected element.
State is like spreadsheets cells that hold a value.

MobX adds observable capabilities to existing data structures like objects, arrays and class instances.
This can simply be done by using `makeObservable` in its constructor to annotate your class properties as `observable`.

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

Using `observable` is like turning a property of an object into a spreadsheet cell.
But unlike spreadsheets, these values can be not only primitive values, but also references, objects and arrays.

But what about `toggle`, which we marked `action`?

### 2. Actions

An _action_ is any piece of code that changes the _state_. User events, backend data pushes, scheduled events, etc.
An action is like a user that enters a new value in a spreadsheet cell.

In the `Todo` model you can see that we have a method `toggle` that changes the value of `finished`. `finished` is marked as `observable`. MobX requires that you mark any code that changes an `observable` as an [`action`](../refguide/action.md).
By marking methods this way you make MobX automatically apply transactions for optimal performance.

This helps you structure your code and prevents you from inadvertantly changing state when you don't want to. This is the default behavior and is recommended.
You can however loosen [_strict mode_](../refguide/api##-enforceactions-) to allow you to modify state outside actions as well.

### 3. Derivations

_Anything_ that can be derived from the _state_ without any further interaction is a derivation.
Derivations exist in many forms:

-   The _user interface_.
-   _Derived data_, such as the number of todos left.
-   _Backend integrations_ like sending changes to the server.

MobX distinguishes two kind of derivations:

-   _Computed values_. These are values that can always be derived from the current observable state using a pure function.
-   _Reactions_. Reactions are side effects that need to happen automatically if the state changes. These are needed as a bridge between imperative and reactive programming. Or to make it more clear, they are ultimately needed to achieve I/O.

People starting with MobX tend to use reactions too often.
The golden rule is: if you want to create a value based on the current state, use `computed`.

#### Computed

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

Computations like these resemble formulas in spreadsheet programs like MS Excel. They update automatically, and only when required.

#### Reactions

For you as a user to be able to see a change in state or computed values on the screen a _reaction_ is needed that repaints part of the GUI.

Reactions are similar to a computed value, but instead of producing a new value, a reaction produces a side effect for things like printing to the console, making network requests, incrementally updating the React component tree to patch the DOM, etc.
In short, reactions bridge [reactive](https://en.wikipedia.org/wiki/Reactive_programming) and [imperative](https://en.wikipedia.org/wiki/Imperative_programming) programming.

##### React components

If you are using React, you can turn your (stateless function) components into reactive components by wrapping it with the [`observer`](http://mobxjs.github.io/mobx/react/react-integration.html) function from the `mobx-react` package.

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

`observer` turns React (function) components into derivations of the data they render.
When using MobX there are no smart or dumb components.
All components render smartly but are defined in a dumb manner. MobX will simply make sure the components are always re-rendered whenever needed, but also no more than that. So the `onClick` handler in the above example will force the proper `TodoView` to render as it uses the `toggle` action, and it will cause the `TodoListView` to render if the number of unfinished tasks has changed.
However, if you would remove the `Tasks left` line (or put it into a separate component), the `TodoListView` will no longer re-render when ticking a box.

##### Linting

If you find it hard to adopt the mental model of MobX, MobX can be configured to be very strict and warn at run-time whenever you deviate from these patterns. See [linting MobX](../refguide/configure.md#linting-options).

##### Try it out!

You can try this out yourself on [CodeSandbox](https://codesandbox.io/s/concepts-principles-il8lt?file=/src/index.js:1161-1252).

You can verify this yourself by changing the [JSFiddle](https://jsfiddle.net/mweststrate/wv3yopo0/).

##### Learn more

To learn more about how React works with MobX, read [React integration](../react/react-integration.md).

##### Custom reactions

Custom reactions can simply be created using the [`autorun`](../refguide/autorun.md),
[`reaction`](../refguide/reaction.md) or [`when`](../refguide/when.md) functions to fit your specific situations.

For example the following `autorun` prints a log message each time the amount of `unfinishedTodoCount` changes:

```javascript
/* a function that observes the state */
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

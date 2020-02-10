---
title: Concepts & Principles
sidebar_label: Concepts & Principles
hide_title: true
---

# Concepts & Principles

<div id='codefund'></div><div class="re_2020"><a class="re_2020_link" href="https://www.react-europe.org/#slot-2149-workshop-typescript-for-react-and-graphql-devs-with-michel-weststrate" target="_blank" rel="sponsored noopener"><div><div class="re_2020_ad" >Ad</div></div><img src="/img/reacteurope.svg"><span>Join the author of MobX at <b>ReactEurope</b> to learn how to use <span class="link">TypeScript with React</span></span></a></div>

## Concepts

MobX distinguishes the following concepts in your application. You saw them in the previous gist, but let's dive into them in a bit more detail.

### 1. State

_State_ is the data that drives your application.
Usually there is _domain specific state_ like a list of todo items and there is _view state_ such as the currently selected element.
Remember, state is like spreadsheets cells that hold a value.

### 2. Derivations

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

Back to the spreadsheet analogy, formulas are derivations that _compute_ a value. But for you as a user to be able to see it on the screen a _reaction_ is needed that repaints part of the GUI.

### 3. Actions

An _action_ is any piece of code that changes the _state_. User events, backend data pushes, scheduled events, etc.
An action is like a user that enters a new value in a spreadsheet cell.

Actions can be defined explicitly in MobX to help you to structure code more clearly.
If MobX is used in [_strict mode_](../refguide/api##-enforceactions-), MobX will enforce that no state can be modified outside actions.

## Principles

MobX supports a uni-directional data flow where _actions_ change the _state_, which in turn updates all affected _views_.

![Action, State, View](../assets/action-state-view.png)

All _Derivations_ are updated **automatically** and **atomically** when the _state_ changes. As a result it is never possible to observe intermediate values.

All _Derivations_ are updated **synchronously** by default. This means that, for example, _actions_ can safely inspect a computed value directly after altering the _state_.

_Computed values_ are updated **lazily**. Any computed value that is not actively in use will not be updated until it is needed for a side effect (I/O).
If a view is no longer in use it will be garbage collected automatically.

All _Computed values_ should be **pure**. They are not supposed to change _state_.

## Illustration

The following listing illustrates the above concepts and principles:

```javascript
import { observable, autorun } from "mobx"

var todoStore = observable({
    /* some observable state */
    todos: [],

    /* a derived value */
    get completedCount() {
        return this.todos.filter(todo => todo.completed).length
    }
})

/* a function that observes the state */
autorun(function() {
    console.log("Completed %d of %d items", todoStore.completedCount, todoStore.todos.length)
})

/* ..and some actions that modify the state */
todoStore.todos[0] = {
    title: "Take a walk",
    completed: false
}
// -> synchronously prints 'Completed 0 of 1 items'

todoStore.todos[0].completed = true
// -> synchronously prints 'Completed 1 of 1 items'
```

In the [10 minute introduction to MobX and React](https://mobx.js.org/getting-started) you can dive deeper into this example and build a user interface using [React](https://facebook.github.io/react/) around it.

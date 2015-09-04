# Concepts & Principles

## Concepts

Mobservable destinguishes the following concepts in your application. You saw them in the previous gist, but let's dive into them in a bit more detail.

### 1. State

_State_ is the data that drives your application. 
Usually there is _domain specific state_ like a list of todo items and there is _view state_ such as the currently selected element.
Remember, state is like spreadsheets cells that hold a value.

### 2. Views

_Views_ are all forms of data that can be derived from the _state_ without any further interaction. 
Views exist in many forms:

* The _user interface_.
* _Derived data_, such as the amount of todos left.
* _Backend integrations_ like sending changes to the server.

Views are characterized by the fact that they never change the _state_.
Views are like spreadsheet cells that hold a formula.

### 3. Actions

An _action_ is any piece of code that changes the _state_. User events, backend data pushes, scheduled events etc.
An action is like a user that enters a new value in a spreadsheet cell.

## Principles

Mobservable supports an uni-directional dataflow where _actions_ changes the _state_, which in turn updates all affected _views_.

![Action, State, View](../images/action-state-view.png)

_Views_ are updated **atomically** when the _state_ changes. As a result it is not possible to ever observe intermediate values.

_Views_ are updated **synchonously** by default. This means that for example _actions_ can safely inspect a _view_ directly after altering the _state_.

_Views_ are updated **lazily**. A View that is not actively in use will not be updated.
This largely avoids the need to dispose views.
If a view is no longer in use it will be garbage collected automatically.

_Side effects_ are special views which are not lazy.
Use _side effects_ if you have _view_ that should always be updated, even if it is not in use by other views.
_Side effects_ are useful in any place where you need to kick off some imperative code automatically if the _state_ changed.
This is useful **to achieve effects** like logging to the console or sending changes to the server.

All _views_ must be **pure**. They are not allowed to change _state_. 
This applies even to _side effects_.
This might sound a bit contradictionary, but it means that you are allowed to do anything in side effects, except for changing the state.
This is strictly speaking not a technically requirement of Mobservable,
it is a designed contraint to protect your sanity :).


## Illustration

The following listing illustrates the above concepts and principles:

```javascript
import {makeReactive, sideEffect} from 'mobservable';

var todoStore = makeReactive({
	/* some reactive state */
	todos: [],
	
	/* a reactive view */
	completedCount: function() {
		return this.todos.filter(() => todo.completed).length;
	}
});

/* a sideEffect */
sideEffect(function() {
	console.log("Completed %d of %d items",
		todoStore.completedCount, 
		todoStore.todos.length
	);
});

/* ..and some actions that modify the state */
todoStore.todos[0] = {
	title: "Take a walk",
	completed: false
};
// -> synchronously prints 'Completed 0 of 1 items'

todoStore.todos[0].completed = true;
// -> synchronously prints 'Completed 1 of 1 items'

```

In the [5 minute introduction to Mobservable and React](mweststrate.github.io/mobservable/getting-started.html) you can dive deeper into this example and build an user interface using [React](https://facebook.github.io/react/) around it.
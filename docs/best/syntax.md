# ES5 / ES6 / TypeScript flavored examples

Here are some examples show you how you can make the state of a simple todo application reactive,
using different flavors.

#### ES5 with plain objects

```javascript
var todoStore = mobservable.makeReactive({
    todos: [{
          title: 'Find a clean mug',
          completed: true
    }],
    completedCount: function() {
        return this.todos.filter(function(todo) {
            return todo.completed;
        }).length;
    }
});
```

#### ES5 with constructor function

```javascript
function TodoStore() {
    mobservable.extendReactive(this, {
        todos: [{
            title: 'Find a clean mug',
            completed: true
        }],
        completedCount: function() {
            return this.todos.filter(function(todo) {
                return todo.completed;
            }).length;
        }
    });
}
```

Note that the constructor could also be written like: `this.todos = mobservable.makeReactive([{ ... }])`. The advantage of using `extendReactive` is that it makes the `this.todos` reference itself observable as well, so that you can safely assign a new array to it later on (although it is best practice to never do such thing).

#### ES6 classes

```javascript
class TodoStore {
    constructor() {
        mobservable.extendReactive(this, {
            todos: [{
                title: 'Find a clean mug',
                completed: true
            }]
        });
    },
    @observable get completedCount() {
        return this.todos.filter((todo) => todo.completed).length;
    }
}
```

#### TypeScript

```javascript
/// <reference path="./node_modules/mobservable/dist/mobservable.d.ts"/>

class TodoStore {
    @observable todos = [{
        title: 'Find a clean mug',
        completed: true
    }];
    @observable get completedCount() {
        return this.todos.filter((todo) => todo.completed).length;
    }
}
```

## Components in ES6 / TypeScript

For ES6+ users, components can also be declared using classes.
`reactiveComponent` can be used in that case as a decorator.
```javascript
@reactiveComponent class MyComponent extends React.Component {
  /* .. */
}
```

# ES5 / ES6 / TypeScript flavored examples

Here are some examples show you how you can make the state of a simple todo application observable,
using either plain objects or classes.
MobX ships with TypeScript typings in the package (supported in TypeScript 1.6 and higher).
So `import * as mobx from "mobx"` gives access to the strongly typed api without further imports.

## Creating objects

### ES5 / ES6 / TS: Making plain objects observable

```javascript
var todoStore = mobx.observable({
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

### ES5 constructor functions

If `TodoStore` is a constructor function that is typically invoked using the `new` keyword,
`extendObservable` can be used to add observable properties to the object during creation:

```javascript
function TodoStore() {
    mobx.extendObservable(this, {
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

### ES6 / TypeScript classes

When using ES6 or TypeScript it is recommended to use the `@observable` decorator to make observable properties or derivations.
Note that getters should be used to define observable functions on a class.This is to keep the type of a derived value consistent between ES5 / ES6 and TypeScript:
Use `store.completedCount` to obtain a derived value; not `store.completedCount()`.
In contrast, `@observable someFunction() {}` will just create an observable reference to `someFunction`, but `someFunction` itself won't become reactive.


```javascript
class TodoStore {
    @observable todos = todos: [{
        title: 'Find a clean mug',
        completed: true
    }]

    @observable get completedCount() {
        return this.todos.filter((todo) => todo.completed).length;
    }
}
```

## React components

In combination with `@observer` decorator from the `mobx-react` package:

## Components in ES5

```javascript
var MyComponent = observer(React.createClass({
    render: function() {
        return <button onClick={this.onButtonClick}>Hi</button>
    },
    onButtonClick: function(e) {
        // bound function
    }
});
```

If stateless component functions are used:

```javascript
var MyOtherComponent = observer(function(props) {
    return <div>{props.user.name{/div};
});
```

## Components in ES6 / TypeScript

```javascript
@observer class MyComponent extends React.Component {
    render() {
        // Warning: don't use {this.onButtonClick.bind(this)} or {() => this.onButtonClick} !
        return <button onClick={this.onButtonClick}>Hi</button>
    }

    onButtonClick = (e) => {
        // bound function
    }
}
```

If stateless component functions are used:

```javascript
const MyOtherComponent = observer(props => // ..or with destructuring: ({user}) => ..
    <div>{props.user.name{/div}
);
```

Please note that `onButtonClick` is not just a class method, but an instance field which get a bound function.
This is the most convenient and the fastest way to create bound event handlers.
If `{this.onButtonClick.bind(this)}` or `{(e) => this.onButtonClick(e)}` was used instead in the rendering, each render invocation would create a new closures.
That is not only slightly slower in itself, 
but it will also cause the `button` (or any other component) to be always re-rendered because you are effectively passing a new event handler to the button each time `MyComponent` is rendered.  


## Enabling decorators in your transpiler

Decorators are not supported by default when using TypeScript or Babel pending a definitive definition in the ES standard.
* For _typescript_, enable the `--experimentalDecorators` compiler flag or set the compiler option `experimentalDecorators` to `true` in `tsconfig.json` (Recommended)
* For _babel5_, make sure `--stage 0` is passed to the babel CLI
* For _babel6_, see the example configuration as suggested in this [issue](https://github.com/mobxjs/mobx/issues/105)
---
sidebar_label: Common Pitfalls & Best Practices
title: Common pitfalls & best practices
hide_title: true
---

# Common pitfalls & best practices

<div id='codefund'></div><div class="re_2020"><a class="re_2020_link" href="https://www.react-europe.org/#slot-2149-workshop-typescript-for-react-and-graphql-devs-with-michel-weststrate" target="_blank" rel="sponsored noopener"><div><div class="re_2020_ad" >Ad</div></div><img src="/img/reacteurope.svg"><span>Join the author of MobX at <b>ReactEurope</b> to learn how to use <span class="link">TypeScript with React</span></span></a></div>

Stuck with MobX? This section contains a list of common issues people new to MobX might run into.

#### Importing from wrong location

Because MobX ships with typescript typings out of the box, some import autocompleting tools (at least in VSCode) have the habit of auto completing with a wrong import, like

```javascript
// wrong
import { observable } from "mobx/lib/mobx"
```

This is incorrect but will not always immediately lead to runtime errors. So be aware. The only correct way of importing anything from the `mobx` package is:

```javascript
// correct
import { observable } from "mobx"
```

#### Issues with decorators?

For setup tips and limitations on decorators, check the [decorators](decorators.md) page

#### `Array.isArray(observable([1,2,3])) === false`

_This limitation applies to MobX 4 and lower only_

In ES5 there is no way to reliably inherit from arrays, and hence observable arrays inherit from objects.
This means that regularly libraries are not able to recognize observable arrays as normal arrays (like lodash, or built-in operations like `Array.concat`).
This can simply be fixed by passing calling `observable.toJS()` or `observable.slice()` before passing the array to another library.
As long as the external library has no intent to modify the array, this will further work completely as expected.
You can use `isObservableArray(observable)` to check whether something is an observable array.

#### `object.someNewProp = value` is not picked up

_This limitation applies to MobX 4 and lower_

_In MobX 5 this limitation applies to class instances and other objects that were **not** created using `observable()` / `observable.object()`._

MobX observable _objects_ do not detect or react to property assignments that weren't declared observable before.
So MobX observable objects act as records with predefined keys.
You can use `extendObservable(target, props)` to introduce new observable properties to an object.
However object iterators like `for .. in` or `Object.keys()` won't react to this automatically.
If you need a dynamically keyed object in MobX 4 and lower, for example to store users by id, create observable _maps_ using [`observable.map`](../refguide/map.md) or use the utility methods as exposed by the [Object API](../refguide/object-api.md).
For more info see [what will MobX react to?](https://mobx.js.org/best/react.html#what-does-mobx-react-to).

### Use `@observer` on all components that render `@observable`s.

`@observer` only enhances the component you are decorating, not the components used inside it.
So usually all your components should be decorated. Don't worry, this is not inefficient, in contrast, more `observer` components make rendering more efficient.

### `@inject('store')` before `@observer` will cause MobX to not trigger

The effect with React is that the it will never render on observable changes.

This is wrong

```typescript
@observer
@inject('store')
```

It must be

```typescript
@inject('store')
@observer
```

You'll notice a warning

```
Mobx observer: You are trying to use 'observer' on a component that already has 'inject'. Please apply 'observer' before applying 'inject'
```

### Don't copy observables properties and store them locally

Observer components only track data that is accessed _during_ the render method. A common mistake is that data plucked of from an observable property and stored will for that reason not be tracked:

```javascript
class User {
    @observable name
}

class Profile extends React.Component {
    name

    componentWillMount() {
        // Wrong
        // This dereferences user.name and just copies the value once! Future updates will not be tracked, as lifecycle hooks are not reactive
        // assignments like these create redundant data
        this.name = this.props.user.name
    }

    render() {
        return <div>{this.name}</div>
    }
}
```

The correct approach is either by not storing the values of observables locally (obviously, the above example is simple but contrived), or by defining them as computed property:

```javascript
class User {
    @observable name
}

class Profile extends React.Component {
    @computed get name() {
        // correct; computed property will track the `user.name` property
        return this.props.user.name
    }

    render() {
        return <div>{this.name}</div>
    }
}
```

### Render callbacks are _not_ part of the render method

Because `observer` only applies to exactly the `render` function of the current component; passing a render callback or component to a child component doesn't become reactive automatically.
For more details, see the [what will Mobx react to](https://mobx.js.org/best/react.html#what-does-mobx-react-to) guide.

### Dereference values as late as possible

MobX can do a lot, but it cannot make primitive values observable (although it can wrap them in an object see [boxed observables](../refguide/boxed.md)).
So it is not the _values_ that are observable, but the _properties_ of an object. This means that `@observer` actually reacts to the fact that you dereference a value.
So in our above example, the `Timer` component would **not** react if it was initialized as follows:

```javascript
ReactDOM.render(<Timer timerData={timerData.secondsPassed} />, document.body)
```

In this snippet just the current value of `secondsPassed` is passed to the `Timer`, which is the immutable value `0` (all primitives are immutable in JS).
That number won't change anymore in the future, so `Timer` will never update. It is the property `secondsPassed` that will change in the future,
so we need to access it _in_ the component. Or in other words: always try to pass the owning object of an observable property.
For more info see [what will MobX react to?](https://mobx.js.org/best/react.html#what-does-mobx-react-to).

#### Computed values run more often than expected

If a computed property is _not_ in use by some reaction (`autorun`, `observer` etc), computed expressions will be evaluated lazily; each time their value is requested (so they just act as normal property).
Computed values will only track their dependencies if they are observed.
This allows MobX to automatically suspend computations that are not actively in use.
See this [blog](https://medium.com/@mweststrate/becoming-fully-reactive-an-in-depth-explanation-of-mobservable-55995262a254) or [issue #356](https://github.com/mobxjs/mobx/issues/356) for an explanation.
So if you fiddle arounds, computed properties might not seem efficient. But when applied in a project that uses `observer`, `autorun` etc, they become very efficient.

MobX `computed`s will automatically be kept alive during transactions as well, see PRs: [#452](https://github.com/mobxjs/mobx/pull/452) and [#489](https://github.com/mobxjs/mobx/pull/489)

To force computed values to stay alive one can use the `keepAlive: true` option, but note that this can potentially create memory leaks.

#### Always dispose reactions

All forms of `autorun`, `observe` and `intercept` will only be garbage collected if all objects they observe are garbage collected themselves.
So it is recommend to use the disposer function that is returned from these methods to stop them when you no longer need them.
Usually for `observe` and `intercept` it is not strictly necessary to dispose them if when targed `this`.
For reactions like `autorun` it is more tricky, as they might observe many different observables, and as long as one of them is still in scope,
the reaction will remain in scope which means that all other observables it uses are also kept alive to support future recomputions.
So make sure to always dispose your reactions when you no longer need them!

Example:

```javascript
const VAT = observable(1.2)

class OrderLine {
    @observable price = 10
    @observable amount = 1
    constructor() {
        // this autorun will be GC-ed together with the current orderline instance
        this.handler = autorun(() => {
            doSomethingWith(this.price * this.amount)
        })
        // this autorun won't be GC-ed together with the current orderline instance
        // since VAT keeps a reference to notify this autorun,
        // which in turn keeps 'this' in scope
        this.handler = autorun(() => {
            doSomethingWith(this.price * this.amount * VAT.get())
        })
        // So, to avoid subtle memory issues, always call..
        this.handler()
        // When the reaction is no longer needed!
    }
}
```

#### I have a weird exception when using `@observable` in a React component.

The following exception: `Uncaught TypeError: Cannot assign to read only property '__mobxLazyInitializers' of object` occurs when using a `react-hot-loader` that does not support decorators.
Either use `extendObservable` in `componentWillMount` instead of `@observable`, or upgrade to `react-hot-loader` `"^3.0.0-beta.2"` or higher.

#### The display name of react components is not set

If you use `export const MyComponent = observer(props => <div>hi</div>)`, no display name will be visible in the devtools.
The following approaches can be used to fix this:

```javascript
// 1 (set displayName explicitly)
export const MyComponent = observer(props => <div>hi</div>)
myComponent.displayName = "MyComponent"

// 2 (MobX infers component name from function name)
export const MyComponent = observer(function MyComponent(props) { return <div>hi</div> })

// 3 (transpiler will infer component name from variable name)
const _MyComponent = props => <div>hi</div>
export const MyComponent = observer(_MyComponent)

// 4 (with default export)
const MyComponent = props => <div>hi</div>
export default observer(MyComponent)
```

See also: http://mobxjs.github.io/mobx/best/stateless-HMR.html or [#141](https://github.com/mobxjs/mobx/issues/141#issuecomment-228457886).

#### The propType of an observable array is object

Observable arrays are actually objects, so they comply to `propTypes.object` instead of `array`.
`mobx-react` provides its explicit `PropTypes` for observable data structures.

#### Rendering ListViews in React Native

`ListView.DataSource` in React Native expects real arrays. Observable arrays are actually objects, make sure to `.slice()` them first before passing to list views. Furthermore, `ListView.DataSource` itself can be moved to the store and have it automatically updated with a `@computed`, this step can also be done on the component level.

```javascript
class ListStore {
    @observable list = ["Hello World!", "Hello React Native!", "Hello MobX!"]

    ds = new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 })

    @computed get dataSource() {
        return this.ds.cloneWithRows(this.list.slice())
    }
}

const listStore = new ListStore()

@observer
class List extends Component {
    render() {
        return (
            <ListView
                dataSource={listStore.dataSource}
                renderRow={row => <Text>{row}</Text>}
                enableEmptySections={true}
            />
        )
    }
}
```

For more info see [#476](https://github.com/mobxjs/mobx/issues/476)

#### Declaring propTypes might cause unnecessary renders in dev mode

See: https://github.com/mobxjs/mobx-react/issues/56

#### Don't decorate (some) React lifecycle methods as `action.bound` on `Observer` React components

As mentioned above, all React components which used observable data should be marked as `@observer` Additionally, if you are going to be modifying any observable data in a function in your React component, that function should be marked as `@action`. Additionally, if you want `this` to refer to the instance of your component class, you should use `@action.bound`. Consider the following class:

```js
class ExampleComponent extends React.Component {
  @observable disposer // <--- this value is disposed in addActed

  @action.bound
  addActed() {
    this.dispose()
  }

  @action.bound
  componentDidMount() {
    this.disposer = this.observe(....) //<-- details don't matter
  }
}
```

If you call `addActed()` on a mounted `ExampleComponent`, the disposer is called.

On the other hand, consider the following:

```js
class ExampleComponent extends React.Component {
  @observable disposer // <--- this value is disposed in addActed

  @action.bound
  componentWillUnmount() {
    this.dispose()
  }

  @action.bound
  componentDidMount() {
    this.disposer = this.observe(....) //<-- details don't matter
  }
}
```

In this case, your `disposer` will never be called! The reason is that the mixin for making the `ExampleComponent` an `observer`, the modifies the `componentWillUnmount` function which changes `this` to an unexpected `React.Component` instance (don't know which one). To work around this, declare`componentWillUnmount()` as follows:

```js
componentWillUnmount() {
  runInAction(() => this.dispose())
}
```

# How to (not) use decorators

Using ES.next decorators in MobX is optional. This section explains how to use them, or how to avoid them.

Advantages of using decorators:
* Minimizes boilerplate, declarative.
* Easy to use and read. A majority of the MobX users use them.

Disadvantages of using decorators:
* Stage-2 ES.next feature
* Requires a little setup and transpilation, only supported with Babel / Typescript transpilation so far

## Enabling decorators

If you want to use decorators follow the following steps.

**TypeScript**

Enable the compiler option `experimentalDecorators` in `tsconfig.json` or pass it as flag `--experimentalDecorators` to the compiler.

**Babel:**

Install support for decorators: `npm i --save-dev babel-plugin-transform-decorators-legacy`. And enable it in your `.babelrc` file:

```
{
  "presets": [
    "es2015",
    "stage-1"
  ],
  "plugins": ["transform-decorators-legacy"]
}
```

Note that the order of plugins is important: `transform-decorators-legacy` should be listed *first*.
Having issues with the babel setup? Check this [issue](https://github.com/mobxjs/mobx/issues/105) first.

## Creating observable properties without decorators

Without decorators `extendObservable` can be used to introduce observable properties on an object.
Typically this is done inside a constructor function.
The following example introduces observable properties, a computed property and an action in a constructor function / class:

```javascript
function Timer() {
	extendObservable(this, {
		start: Date.now(),
		current: Date.now(),
		get elapsedTime() {
			return (this.current - this.start) + "seconds"
		},
        tick: action(function() {
          	this.current = Date.now()
        })
	})
}
```

Or, when using classes:

```javascript
class Timer {
	constructor() {
		extendObservable(this, {
			/* See previous listing */
		})
	}
}
```

## Creating observable properties with decorators

Decorators combine very nicely with classes.
When using decorators, observables, computed values and actions can be simply introduced by using the decorators:

```javascript
class Timer {
	@observable start = Date.now();
	@observable current = Date.now();

	@computed get elapsedTime() {
		return (this.current - this.start) + "seconds"
	}

	@action tick() {
		this.current = Date.now()
	}
}
```

## Creating observer components

The `observer` function / decorator from the mobx-package converts react components into observer components.
The rule to remember here is that `@observer class ComponentName {}` is simply sugar for `const ComponentName = observer(class { })`.
So all the following forms of creating observer components are valid:

Stateless function component, ES5:

```javascript
const Timer = observer(function(props) {
	return React.createElement("div", {}, props.timer.elapsedTime)
})
```

Stateless function component, ES6:

```javascript
const Timer = observer(({ timer }) =>
	<div>{ props.timer.elapsedTime }</div>
)
```

React component, ES5:

```javascript
const Timer = observer(React.createClass({
	/* ... */
}))
```

React component class, ES6:

```javascript
const Timer = observer(class Timer extends React.Component {
	/* ... */
})
```

React component class with decorator, ES.next:

```javascript
@observer
class Timer extends React.Component {
	/* ... */
}
```

# Modifiers for observable

By default, `observable` recursively makes all the values of _plain_ objects and arrays recursively observable.
Besides that, it automatically converts functions without arguments into reactive views or derived properties.
For all other types of values just a reference is stored.
In general, this should just do what you need, but if you want you can override the default behavior using _modifiers_.
Note that modifiers are 'sticky', they are interpreted as being annotations.
They do not only apply to the current value, but also to all values that are assigned in the future to the same attribute.

Note that the attributes class instances (all objects that have a prototype) will not be made observable automatically by `observable`.
It is considered to be the responsibility of the class definition / constructor function to mark the necessary attributes of a class instance observable / computed.

## computed

Introduces a computed property, see [`computed`](http://mobxjs.github.io/mobx/refguide/computed-decorator.html)

## action

Marks a function as action, see [`action`](http://mobxjs.github.io/mobx/refguide/action.html)

## asMap

Creates a new Observable Map instead of an Observable Object. See [`asMap`](map.md)

## asReference

The most common modifier is `asReference`.
If this modifier is used, `observable` will not attempt to make the value observable.
Use this for example if you want to store a reference to a function, instead of creating a view based on that function.
You can also use it to prevent that plain objects or arrays are made observable automatically.

```javascript

var test = observable({
	x : 3,
	doubler: function() {
		return this.x*2;
	},
	someFunc: asReference(function() {
		return this.x;
	})
});

console.log(test.doubler); // === 6
console.log(test.someFunc); // still a function
```

## asStructure

Can be used on non-cyclic, plain JavaScript values.
Instead of comparing old values with new values based on whether the reference has changed, values are compared using deep equality before notifying any observers.
This is useful if you are working with 'struct' like objects like colors or coordinates and each time return fresh objects with possibly the same values.
`asStructure` can be used on reactive functions, plain objects and arrays.

```javascript
var ViewPort = mobxReact.observer(React.createClass({
    displayName: 'ViewPort',

    componentWillMount: function() {
        mobx.extendObservable({
            screenSize: {
                width: 0,
                height: 0
            },
            minSize: {
                width: 400,
                height: 300
            },
            viewPortSize: mobx.asStructure(function() {
                return {
                    width: Math.max(this.screenSize.width, this.minSize.width),
                    height: Math.max(this.screenSize.height, this.minSize.height)
                }
            }
        });

        window.onresize = function() {
            mobx.transaction(function() {
                this.screenSize.width = window.innerWidth;
                this.screenSize.height = window.innerHeight;
            });
        }.bind(this);
    },

    render: function() {
        return (
            <div style={{
                width: this.viewPortSize.width,
                height: this.viewPortSize.height
            }}>
                test
            </div>
        );
    }
}));
```

In the above example, the computed method `viewPortSize` returns a fresh object on each re-computation.
So MobX considers it to have changed always. This means that each `resize` event of the browser will trigger a re-render of the
`ViewPort` component.

However, if the window size is smaller that the `minSize`, the resize doesn't need to influence the rendering anymore, as the computed
will return the same dimensions after each run. `asStructure` signals to MobX that observers of this computation should only be triggered
if the value returned by the computed has _structurally_ changed (by default strict equality is used to determine whether observers need to be notified).
This means that a new object that is returned from `viewPortSize` won't trigger a `render` if its contents are (structurally) the same as the previous value.

To use the `asStructure` modifier in combination with the `@computed` decorator, use the following:

```javascript
@computed({ asStructure: true }) get viewPortSize() {
    return {
        width: Math.max(this.screenSize.width, this.minSize.width),
        height: Math.max(this.screenSize.height, this.minSize.height)
    }
}
```

## asFlat

Similar to `asReference`, except that `asFlat` does not prevent its value from becoming observable, but only the children of the value.
It can be used for example to create an observable array or object that should not automatically make its children observable.

```javascript
var todos = observable(asFlat([{
	title: "make coffee",
	completed: false
}]));

isObservable(todos); // true
isObservable(todos[0]); // false
isObservable(todos[0], "title"); // false
```

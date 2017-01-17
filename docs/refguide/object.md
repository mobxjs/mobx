## Observable Objects

If a plain JavaScript object is passed to `observable` all properties inside will be copied into a clone and made observable.
(A plain object is an object that wasn't created using a constructor function / but has `Object` as its prototype, or no prototype at all.)
`observable` is by default applied recursively, so if one of the encoutered values is an object or array, that value will be passed through `observable` as well.

```javascript
import {observable, autorun, action} from "mobx";

var person = observable({
    // observable properties:
	name: "John",
	age: 42,
	showAge: false,

    // computed property:
	get labelText() {
		return this.showAge ? `${this.name} (age: ${this.age})` : this.name;
	},

    // action:
    setAge: action(function() {
        this.age = 21;
    })
});

// object properties don't expose an 'observe' method,
// but don't worry, 'mobx.autorun' is even more powerful
autorun(() => console.log(person.labelText));

person.name = "Dave";
// prints: 'Dave'

person.setAge(21);
// etc
```

Some things to keep in mind when making objects observable:

* When passing objects through `observable`, only the properties that exist at the time of making the object observable will be observable.
Properties that are added to the object at a later time won't become observable, unless [`extendObservable`](extend-observable.md) is used.
* Only plain objects will be made observable. For non-plain objects it is considered the responsibility of the constructor to initialize the observable properties.
Either use the [`@observable`](observable.md) annotation or the [`extendObservable`](extend-observable.md) function.
* Property getters will be automatically turned into derived properties, just like [`@computed`](computed-decorator) would do.
* `observable` is applied recursively to a whole object graph automatically. Both on instantiation and to any new values that will be assigned to observable properties in the future. Observable will not recurse into non-plain objects.
* These defaults are fine in 95% of the cases, but for more fine-grained on how and which properties should be made observable, see the [modifiers](modifiers.md) section.

# `observable.object(props)` & `observable.shallowObject(props)`

`observable(object)` is just a shorthand for `observable.object(props)`.
All properties are by default made deep observable.
[modifiers](modifiers.md) can be used to override this behavior for individual properties.
`shallowObject(props)` can be used to make the properties only shallow observables. That is, the reference to the value is observabled, but the value itself won't be made observable automatically.

## Name argument

Both `observable.object` and `observable.shallowObject` take a second parameter which is used as debug name in for example `spy` or the MobX dev tools.

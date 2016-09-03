## Observable Objects

If a plain JavaScript object is passed to `observable` all properties inside that object will be made observable.
(A plain object is an object that wasn't created using a constructor function)
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
* _Deprecated_ Argumentless functions will be automatically turned into derived properties, just like [`@computed`](computed-decorator) would do.
* `observable` is applied recursively to a whole object graph automatically. Both on instantiation and to any new values that will be assigned to observable properties in the future. Observable will not recurse into non-plain objects.
* These defaults are fine in 95% of the cases, but for more fine-grained on how and which properties should be made observable, see the [modifiers](modifiers.md) section.


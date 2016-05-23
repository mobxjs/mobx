## Observable Objects

If a plain JavaScript object is passed to `observable` (that is, an object that wasn't created using a constructor function),
MobX will recursively pass all its values through `observable`.
This way the complete object (tree) is in-place instrumented to make it observable.

```javascript
import {observable, autorun} from "mobx";

var person = observable({
	name: "John",
	age: 42,
	showAge: false,
	labelText: function() {
		return this.showAge ? `${this.name} (age: ${this.age})` : this.name;
	}
});

// object properties don't expose an 'observe' method,
// but don't worry, 'mobx.autorun' is even more powerful
autorun(() => console.log(person.labelText));

person.name = "Dave";
// prints: 'Dave'

person.age = 21;
// etc
```

Some things to keep in mind when making objects observable:

* When passing objects through `observable`, only the properties that exist at the time of making the object observable will be observable.
Properties that are added to the object at a later time won't become observable, unless [`extendObservable`](extend-observable.md) is used.
* Only plain objects will be made observable. For non-plain objects it is considered the responsibility of the constructor to initialize the observable properties.
Either use the [`@observable`](observable.md) annotation or the [`extendObservable`](extend-observable.md) function.
* Argumentless functions will be automatically turned into views, just like [`@computed`](computed-decorator) would do. For view `this` will be automatically bound to the object it is defined on.
However, if a function expression (ES6 / TypeScript) is used, `this` will be bound to `undefined`, so you probably want to either to refer to the object directly, or to use a classic function.
* `observable` is applied recursively, both on instantiation and to any new values that will be assigned to observable properties in the future.
* These defaults are fine in 95% of the cases, but for more fine-grained on how and which properties should be made observable, see the [modifiers](modifiers.md) section.


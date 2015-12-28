# Observe

Given an observable `object` and a `listener` method, `observe(object, listener)` starts listening for changes on the given object.
The callbacks are invoked with values as described in the specs of 
[Object.observe](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/observe)
and [Array.observe](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe).

Accepted objects are:
* Observable maps (created using `mobservable.map(object)`). Possibly emitted event types are: `"add"`, `"update"` and `"delete"`.
* Observable objects (created using `mobservable.observable(object)`). Possibly emitted event types are `"update"`, and in combination with `extendObservable`, `"add"` might fire as well.
* Observable arrays (created using `mobservable.observable(array)`). Possibly emitted event types are `"update"` and `"splice"`.
* Plain objects will be passed through `mobservable.observable` first. See 'Observable objects' for further details. 
* Plain arrays are _not_ accepted by `observe`. Pass them through `mobservable.observable` first.
* Observable object / map + property name (string) can be used to observe a single property.

The function returns a `disposer` function that can be used to cancel the observer.

Example:

```javascript
import {observable, observe} from 'mobservable';

const person = observable({
	firstName: "Maarten",
	lastName: "Luther"
});

const disposer = observe(person, (change) => {
	console.log(change.type, change.name, "from", change.oldValue, "to", change.object[change.name]);
});

person.firstName =  "Martin";
// Prints: 'update firstName from Maarten to Martin'

disposer();
// Ignore any future updates

// observe a single field
const disposer2 = observe(person, "lastName", (newValue, oldValue) => {
	console.log("LastName changed to ", newValue);
});
```

Note: `transaction` does not affect the working of the `observe` method(s).

Related blog: [Object.observe is dead. Long live Mobservable.observe](https://medium.com/@mweststrate/object-observe-is-dead-long-live-mobservable-observe-ad96930140c5)
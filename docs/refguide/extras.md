This are utilities exposed by mobx which might come in handy at some point. But most probably you won't need them. Ever.

## SimpleEventEmitter

Constructorless class that can be used to register and emit events.
Mainly here for internal purposes.

```javascript
const eachSecondEvent = new mobx.SimpleEventEmitter();

setInterval(() => {
	eachSecondEvent.emit(new Date(), Date.now());
}, 1000);

// fires each second
eachSecondEvent.on((dateObject, epoch) => {
	console.log(dateObject, epoch);
});

// fires only once
eachSecondEvent.once((dateObject, epoch) => {
	console.log(dateObject, epoch);
});
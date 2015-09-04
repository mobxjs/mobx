# Reactive Data Structures

## Reactive Objects

`makeReactive` is the swiss knife of Mobservable. It makes all properties of an object reactive. Or all values in an array.
(and even functions as will be explained in the next chapter).
You can simply create an object with some observable properties as follows:

```javascript
var lolCatz = makeReactive({
	doILikeLolCatz : false,
	favoriteLolCat: null
});
```

For demo purposes, we also create a side effect that prints a message based on `lolCatz`. (side effects will be explained in the next chapter).  

```javascript 
sideEffect(function() {
	if (lolCatz.doILikeLolCatz === false)
		console.log("Never mind...");
	else
		console.log("Check this! ", lolCatz.favoriteLolCat.url);	
});

// prints 'Never mind...'
```

So you can just pass an object into `makeReactive` and you get back a new object holding the same properties. 
But this time the properties will be tracked by Mobservable.
So let's do something funny and add our favorite lolCat to the now reactive object `lolCatz`:

```javascript
lolCatz.favoriteLolCat = {
	url: "http://www.oddee.com/item_97873.aspx"	
};
// doesn't print

lolCatz.doILikeLolCatz = true;
// prints: 'Check this! http://www.oddee.com/item_97873.aspx'

lolCatz.favoriteLolCat.url = "http://cheezburger.com/4518829056";
// prints: 'Check this! http://cheezburger.com/4518829056'
```

Reactive data structures can be altered similar to normal data structures.
New structures that are assigned to already reactive data structures will automatically become reactive as well,
Mobservable will apply `makeReactive` to those values automatically.
So even changes deep inside objects, like the `url` in `favoriteLolCat` will be detected.

So if you have a state tree consisting off plain objects and arrays passing the root object through `makeReactive` once is enough for Mobservable to do its job.
Mobservable will only properties reactive that existed on the object when it was passed through `makeReactive`.
This way, reactive and non-reactive values can live side by side inside the same object.
This allows you for example to define _actions_ on objects that have reactive members. 
But you can read all about that in the Best Practices section. 

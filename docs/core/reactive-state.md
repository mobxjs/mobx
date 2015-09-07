# Reactive Data Structures

## The Basics

`makeReactive` is the swiss knife of Mobservable. It makes all properties of an object reactive. Or all values in an array.
(and even functions as will be explained in the next chapter).
You can simply create an object with some reactive properties as follows:

```javascript
var lolCatz = makeReactive({
	doILikeLolcatz : false,
	favoriteLolcat: null,
	lolcatz: []
});
```

For demo purposes, we also create a side effect that prints a message based on `lolCatz`. (side effects will be explained in the next paragraphs).  

```javascript 
sideEffect(function() {
	if (lolCatz.doILikeLolcatz === false)
		console.log("Never mind...");
	else
		console.log("Check this! ", lolCatz.favoriteLolcat.url);	
});

// prints 'Never mind...'
```

So you can just pass an object into `makeReactive` and you get back a new object holding the same properties. 
But this time the properties will be tracked by Mobservable.
So let's do something funny and add our favorite lolcat to the now reactive object `lolCatz`:

```javascript
lolCatz.favoriteLolcat = {
	url: "http://tinyurl.com/3vwvkga"	
};
// doesn't print

lolCatz.doILikeLolcatz = true;
// prints: 'Check this! http://tinyurl.com/3vwvkga'

lolCatz.favoriteLolcat.url = "http://tinyurl.com/nc7p2ft";
// prints: 'Check this! http://tinyurl.com/nc7p2ft'
```

Reactive data structures can be altered similar to normal data structures.
New structures that are assigned to already reactive data structures will become reactive as well,
Mobservable will apply `makeReactive` to those structures automatically.
So even changes deep inside new objects, like the `url` in `favoriteLolcat`, will be detected.

## Arrays and References

With Mobservable, you can freely work with arrays and references.
So instead of picking only one favorite lolcat, let's add two of them to the `lolcatz` array and use the `favoriteLolcat` property as a reference:

```javascript
lolCatz.lolcatz.push(
	{ url: "ttp://tinyurl.com/3vwvkga" },
	{ url: "http://tinyurl.com/nc7p2ft" }
);

lolCatz.favoriteLolcat = lolCatz.lolcatz[0];
// prints: 'Check this! ttp://tinyurl.com/3vwvkga'
// oops, typo...

lolCatz.lolcatz[0].url = "http://tinyurl.com/3vwvkga"
// prints: 'Check this! http://tinyurl.com/3vwvkga'
```

So, you can freely mix and match objects, references, arrays when using Mobservable.
Just pick the most natural data structure.
Mobservable is unopiniated about your the data structures that store the _state_.
This enables you to write _actions_ as natural as possible.

## Summary

If you have a state tree consisting of plain objects and arrays, passing the root object through `makeReactive` once is enough for Mobservable to do its job.
More details about `makeReactive` can be found in the [reference guide](../refguide/make-reactive.md).
First, let's dive into reactive views.
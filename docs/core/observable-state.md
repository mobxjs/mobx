# Observable Data Structures

## The Basics

`observable` is the swiss knife of Mobservable. It makes all properties of an object observable. Or all values in an array.
(and even functions as will be explained in the next chapter).
You can simply create an object with some observable properties as follows:

```javascript
var lolCatz = observable({
	doILikeLolcatz : false,
	favoriteLolcat: null,
	lolcatz: []
});
```

For demo purposes, we also create an observer that prints a message based on `lolCatz`. (the `observe` function will be explained in the next paragraphs).  

```javascript
observe(function() {
	if (lolCatz.doILikeLolcatz === false)
		console.log("Never mind...");
	else
		console.log("Check this! ", lolCatz.favoriteLolcat.url);
});

// prints 'Never mind...'
```

So you can just pass an object into `observable` and you get back a new object holding the same properties.
But this time the properties will be tracked by Mobservable.
So let's do something funny and add our favorite lolcat to the now observable object `lolCatz`:

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

Observable data structures can be altered similar to normal data structures.
New structures that are assigned to already observable data structures will become observable as well,
Mobservable will apply `observable` to those structures automatically.
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
Mobservable is not opinionated about your the data structures that store the _state_.
This enables you to write _actions_ as natural as possible.

## Summary

If you have a state tree consisting of plain objects and arrays, passing the root object through `observable` once is enough for Mobservable to do its job.
More details about `observable` can be found in the [reference guide](../refguide/make-observable.md).
First, let's dive into reactive views.

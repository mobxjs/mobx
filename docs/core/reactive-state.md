# Reactive Data Structures

## Reactive Objects

`makeReactive` is the swiss knife of mobservable. It makes all properties of an object reactive. Or all values in an array.
So you can simply create an object with some observable properties:

```javascript
var lolCatz = makeReactive({
	doILikeLolCatz : false,
	favoriteLolCat: null
});
```

For demo purposes, we also create a [side effect](TODO) that prints a message based on `lolCatz`.  

```javascript 
sideEffect(function() {
	if (lolCatz.doILikeLolCatz === false)
		console.log("Never mind..");
	else
		console.log("Check this! " + lolCatz.favoriteLolCat.url);	
});

// prints 'Never mind...'
```

So you can just pass an object into `makeReactive` and you get back the same object, but this time with properties that will be tracked by Mobservable.
Let's do something funny, and add our favorite lolCat to the now reactive object `lolCatz`:

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

runner ups

lolcatz pointer


```


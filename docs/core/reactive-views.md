# Reactive Views

## Creating views using `observable`

Reactive views are the things that make Mobservable really lovable.
They are just functions that use some observable data.
But those view function won't just inspect the value once, they will keep tracking what happens to those values and re-evaluate when necessary.
View functions can be created by passing a function (without arguments) to `observable`.
Remember the `lolCatz` data structure from previous paragraph?
Here is a view:

```javascript
var isLolCatzFanatic = observable(function() {
	return lolCatz.doILikeLolcatz && lolCatz.lolcatz.length >= 42;
});
```

That looks a lot like a spreadsheet formula doesn't it?
This view will automatically observe the property `lolCatz.doILikeLolcatz`.
And, as long as `lolCatz.doILikeLolcatz` yields `true`, the view will also observe the reference `lolCatz.lolcatz` and the property `length` of `lolCatz.lolcatz`.
The fact that the system determines itself which values should be observed, distinguishes Transparent FRP libraries from normal FRP libraries like RxJs and Bacon.

Anyway, this view will always yield `false` unless you find another 40 lolcatz, so lets build another view.
`observable(function)` will return a function with which you can inspect the current value, so let's use the previous view in yet another view.

```javascript
var lolCatzHtml = observable(function() {
	return (
		(isLolCatzFanatic() ? "<marquee>Lolcatz!</marquee>" : "") +
		"<h1>Favorite:</h1>" +
		"<img src='" + lolCatz.favoriteLolcat.url + "'/>" +
		"<h2>Runner ups:</h2>" +
		"<ul>" +
		lolCatz.lolcatz.map(function(lolcat) {
			return "<li><img src='" + lolcat.url + "'/></li>";
		}).join("") +
		"</ul>"
	);
});
```

From now on, `lolCatzHtml()` will yield us the latest rendering.
But we can also ask `lolCatzHtml` to pro-actively inform us when there is a new rendering by using the `.observe` method which is available on all views.
You might already be familiar with this concept from other FRP libraries.

```javascript
lolCatzHtml.observe(function(rendering) {
	document.body.innerHTML = rendering;
});
```

In practice you hardly will use 'value.observe' since there is a more powerful alternative: `mobservable.observe`.

## Creating observers `mobservable.observe`

Observers are functions that react to changes in other observable data structures and views.
Actually observers are a special kind of views.
They work just like views, except that they evualate eagerly and do not produce values.
Observers can be used to achieve effects; things that need to happen regardless whether some else is observing the observer.
These effects are typical stuff that needs to be done imperatively; sending requests to the server, logging output, updating the UI.
In a well designed app you will hardly need them.

The big difference between using `value.observe` and `mobservable.observe` is that observers created using the latter method can observe many values at the same time.
So we can rewrite the above observer to as:

```javascript
mobservable.observe(function() {
	document.body.innerHTML = lolCatzHtml();
});
```

And there it is! A rendering system that renders the `lolCatz` structure automatically to the DOM whenever a relevant value inside `lolCatz` changes.
Note that just like views, observers are not required to state their dependencies explicitly.
Surely, dumping a bunch of HTML into the DOM isn't a very scalable architecture.
Frameworks like React are way smarter in manipulating the DOM.
Can we add those to the mix...?

(N.B. both `.observe` returns a function that, if invoked, cancels the effect from being called in the future).

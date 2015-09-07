# Reactive Views

## Creating views using `makeReactive`

Views is what makes Mobservable really lovable.
They are just functions that use some reactive data.
But those view function won't just inspect the value once, they will keep tracking what happens to those values and update where necessary.
View functions can be made by passing a function (without arguments) to `makeReactive`.
Remember the `lolCatz` data structure from previous paragraph?
Here is a view:

```javascript
var isLolCatzFanatic = makeReactive(function() {
	return lolCatz.doILikeLolcatz && lolCatz.lolcatz.length >= 42;
});
```

That looks a lot like a spreadsheet formula doesn't it?
This view will automatically observe the property `lolCatz.doILikeLolcatz`.
And, as long as `lolCatz.doILikeLolcatz` yields `true`, the view will also observe the reference `lolCatz.lolcatz` and the property `length` of `lolCatz.lolcatz`.
The fact that the system determines itself which values should be observed distinguishes Transparent FRP libraries from normal FRP libraries like RxJs and Bacon.

Anyway, this view will always yield `false` unless you find me another 40 lolcatz, so lets build another view. 
`makeReactive(function)` will return a function with which you can inspect the current value, so let's use that in yet another view.

```javascript
var lolCatzHtml = makeReactive(function() {
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
But we can also ask `lolCatzHtml` to proactively inform us when there is a new rendering by using the `.observe` method which is available on all views.
You might already be familiar with this function from other FRP libraries.

```javascript
lolCatzHtml.observe(function(rendering) {
	document.body.innerHTML = rendering;
});
```

In practice you hardly will use '.observe' since there is a more powerful alternative: `sideEffect`.

## Creating views with effects using `sideEffect`

Views are derived purely from the state, and observers purely from views.
So observers are in fact view functions as well.
Except that they do not produce a new value, so they must produce side effects to be useful.
So instead of registering observes, we can just create views using the `sideEffect` function.
The big difference is that observers can ultimately observe only one value or stream, while `sideEffect` can observe many values at the same time.
They are just views after all.
So we can rewrite the above observer to a `sideEffect`:

```javascript
sideEffect(function() {
	document.body.innerHTML = lolCatzHtml();
});
```

And there it is, a rendering system that renders the lolCatz structure automatically to the DOM whenever relevant parts changes.
Surely, dumping a bunch of HTML into the DOM isn't a very scalable architecture.
Frameworks like React are way smarter in manipulating the DOM.
Can we add those to the mix...?

(N.B. both `sideEffect` and `.observe` return a function that, if invoked, cancels the effect from being called in the future).
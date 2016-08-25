# Untracked

Untracked allows you to run a piece of code without establishing observers.
Like `transaction`, `untracked` is automatically applied by `(@)action`, so usually it makes more sense to use actions then `untracked` directly.
Example:

```javascript

const person = observable({
	firstName: "Michel",
	lastName: "Weststrate"
});

autorun(() => {
	console.log(
		person.lastName,
		",",
		// this untracked block will return the person's firstName without establishing a dependency
		untracked(() => person.firstName)
	);
});
// prints: Weststrate, Michel

person.firstName = "G.K.";
// doesn't print!

person.lastName = "Chesterton";
// prints: Chesterton, G.K.
```
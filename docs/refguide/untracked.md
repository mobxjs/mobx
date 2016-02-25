# Untracked

*Untracked is an experimental feature that might or might not be useful. If you use this feature in production, please report it here:
https://github.com/mweststrate/mobservable/issues/49, otherwise it might be removed in a future minor release.*

Untracked allows you to run a piece of code without establishing observers. For example:

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
# Creating observable data structures and reactions

## Atoms

At some point you might want to have more data structures or other things (like streams) that can be used in reactive computations.
Achieving that is pretty simple by using the `Atom` class.
Atoms can be used to signal mobx that some observable data source has been observed or changed.
And mobx will signal the atom whenever it is used or no longer in use.

The following example demonstrates how you can create an observable `Clock`, which can be used in reactive functions,
and returns the current date time.
This clock will only actually tick if it is observed by someone. 

The complete API of the `Atom` class is demonstrated by this example.

```javascript
import {Atom, autorun} from "mobx";

class Clock {
	atom;
	intervalHandler = null;
	currentDateTime;
	
	constructor() {
		// creates an atom to interact with the mobx core algorithm
		this.atom =	new Atom(
			// first param a name for this atom, for debugging purposes
			"Clock",
			// second (optional) parameter: callback for when this atom transitions from unobserved to observed.
			() => this.startTicking(),
			// third (optional) parameter: callback for when this atom transitions from observed to unobserved
			// note that the same atom transition multiple times between these two states
			() => this.stopTicking()
		); 
	}
	
	getTime() {
		// let mobx know this observable data source has been used
		this.atom.reportObserved();	
		if (!this.intervalHandler) {
			this.tick(); // do the initial tick
		}
		return this.currentDateTime;
	}
	
	tick() {
		this.currentDateTime = new Date();
		// let mobx know that this data source has changed
		this.atom.reportChanged();
	}
	
	startTicking() {
		this.intervalHandler = setInterval(
			() => this.tick(), 
			1000
		);
	}
	
	stopTicking() {
		clearInterval(this.intervalHandler);
		this.intervalHandler = null;	
	}
}

const clock = new Clock();

const disposer = autorun(() => console.log(clock.getTime()));

// ... prints the time each second

disposer();

// printing stops. If nobody else uses the same `clock` the clock will stop ticking as well.
```

## Reactions

`Reaction` allows you to create your own 'auto runner'.
Reactions track a function and signal when they function should be executed again because one or more dependencies have changed, in which case, for example, 
the function should be re-executed. 



This is for example how `autorun` is defined using `Reaction`:

```typescript
export function autorun(view: Lambda, scope?: any) {
	if (scope)
		view = view.bind(scope);

	const reaction = new Reaction(view.name || "Autorun", function () {
		this.track(view);
	});

	// Start or schedule the just created reaction
	if (isComputingDerivation() || globalState.inTransaction > 0)
		globalState.pendingReactions.push(reaction);
	else
		reaction.runReaction();

	return reaction.getDisposer();
}
```
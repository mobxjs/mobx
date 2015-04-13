
* ~~lazy tests~~
* fix warning in test
* ~~fix lazy cycles~~
* ~~error tests~~
* typescript tets
* ~~rename defineProperty to defineObservableProperty~~
* introduce 1.5 decorator. w00t! https://github.com/Microsoft/TypeScript/wiki/What's-new-in-TypeScript#decorators
* ~~introduce initializeProperties~~
* implement and test observe() methods
* layout elses, rename properties.js -> observables.js
* OCD on test files
* coverage tests
* process remaining optimizations / todo's, document code
* remove memwatch, make tests smaller?
* drop event emitter, to make lib smaller and stand alone? https://github.com/joyent/node/blob/master/lib/events.js
* array.observe conform
* test browser compatibility?
* badges for build, coverage, npm
* use typescript 1.5 spread operator
* examples
* describe properties in readme:
	- atomic updates
	- multiple atomic updates
	- automatic depency detection
	- minimized amount of computations
	- lazy computations
	- synchronous updates (TODO: what about event emitters?)
	- how errors and cycles in computations are dealt with
* optimizations
	- count stale dependencies
	- collapse stale / ready notifications whenever possible
	- heuristic to make computables non-lazy if used frequently
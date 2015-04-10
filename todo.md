
* lazy tests
* fix warning in test
* fix lazy cycles
* error tests
* implement and test observe() methods
* layout elses, rename properties.js -> observables.js
* coverage tests
* process remaining optimizations / todo's
* remove memwatch, make tests smaller?
* badges for build, coverage, npm
* OCD on test files
* examples
* properties
	- atomic updates
	- multiple atomic updates
	- automatic depency detection
	- minimized amount of computations
	- lazy computations
	- synchronous updates (TODO: what about event emitters?)
* optimizations
	- count stale dependencies
	- collapse stale / ready notifications whenever possible
	- heuristic to make computables non-lazy if used frequently
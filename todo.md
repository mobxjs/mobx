
* ~~lazy tests~~
* ~~fix warning in test~~
* ~~fix lazy cycles~~
* ~~error tests~~
* ~~typescript tests~~
* ~~rename defineProperty to defineObservableProperty~~
* ~~introduce 1.5 decorator. w00t! https://github.com/Microsoft/TypeScript/wiki/What's-new-in-TypeScript#decorators~~
* ~~introduce initializeProperties~~
* ~~implement and test observe() methods~~
* ~~toJSON~~
* ~~layout elses, rename properties.js -> observables.js~~
* ~~tabs to spaces everywhere~~
* ~~remove memwatch, make tests smaller?~~
* ~~drop event emitter, to make lib smaller and stand alone? https://github.com/joyent/node/blob/master/lib/events.js, note: clone listeners before invoking, note: document~~
* ~~array.observe conform~~
* ~~badges for build, coverage, npm~~
* ~~process remaining optimizations / todo's, document code~~
* coverage tests
* minified version
* ~~use typescript 1.5 spread operator~~
* ~~use console.trace() in logging where applicable~~
* add 'name' as parameter to observable.value, automatically set it when defining properties, use it in warnings / toString
* IReactiveValue interface
* IObservable interface
* browser support test https://ci.testling.com/
* ~~use destructurings (for example quickdiff)~~
* examples
* introduce extend / properties / defineProperties
* describe properties in readme:
    - synchronous updates
    - atomic updates
    - multiple atomic updates
    - automatic depency detection
    - minimized amount of computations
    - lazy computations
    - how errors and cycles in computations are dealt with
* optimizations
    - ~~pass compute function into DNode in computed observable~~
    - computable's without observers should stay 'awake' after a computation (e.g. being inspected by .get),
        but then go to sleep if one of its dependencies has changed, so that subsequent reads on a computable are cheap even if there are no observers
    - ~~node.addObserver check if new observer doesn't equal the prevous one~~
    - check if somewhere an array is filled that could be preallocate
    - ~~array: recycle properties (or not)~~
    - ~~look into defineProperties / making property creating faster (especially arrays)~~
    - ~~count stale dependencies, instead of looping each time whether all dependencies are ready again.~~
    - collapse stale / ready notifications whenever possible
    - ~~find unmodifyable empty lists / objects and put in var~~
    - ~~heuristic to make computables non-lazy if used frequently (something like, in computable, if (this.lazyReads > this.computesWithoutObservers) then never-go-to-sleep)~~
    - combine multiple adds to array during batch into single splice
    - verify that combine multiple assignments to property during batch are combined into singleupdate
    - verify that multiple computations schedulings during batch result in single computation
* ~~make sure array properties are read only~~

0.4
* License
* implement array.sort & reverse properly, they do change the array
* drop mobservable.onReady / onceReady?
* clean up / clarify properties / annotations code
* drop initializeObservableProperty/ies
* introduce .props(target, prop, value), .props(props), .props(target, ...props)
* use disposable like RxJs?

0.5
* Introduce mobservable.object(data) that creates observable properties and an observe method.
* react components
* should arrays trigger a notify observed for methods like reverse, sort, values, json etc? -> they change the internal structure, so that seems to be weird

0.5

* nested watcher test

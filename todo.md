
* describe properties in readme:
    - synchronous updates
    - atomic updates
    - multiple atomic updates
    - automatic depency detection
    - minimized amount of computations
    - lazy computations
    - how errors and cycles in computations are dealt with
* optimizations
    - computable's without observers should stay 'awake' after a computation (e.g. being inspected by .get),
        but then go to sleep if one of its dependencies has changed, so that subsequent reads on a computable are cheap even if there are no observers -> But, what about GC? this creates pending references until invalidation
    - check if somewhere an array is filled that could be preallocate
    - collapse stale / ready notifications whenever possible
    - combine multiple adds to array during batch into single splice
    - verify that combine multiple assignments to property during batch are combined into singleupdate
    - verify that multiple computations schedulings during batch result in single computation
    - go to sleep if there are no observers and a 'stale' notification comes in 
    - notifyStateChange: avoid or remove scheduler.schedule, or strip closure by passing the DNode in
    - do not wrap around .value in .props, to use save some closures 
    - create dnode.observers / observing lazy, to save memory?
    
0.5
* ~~browser based tests~~
* ~~fix instanceof array~~
* ~~implement + test toPlainValue~~
* ~~make browser / amd / umd build https://github.com/bebraw/grunt-umd https://github.com/umdjs/umd~~
* ~~minify~~
* mobservable.struct (ALWAYS compare deep equal, use defensive copy so that changes in object are detected). Wrap in Struct() object?
* mobservable.computedStruct
* observable annotation on methods should define a method instead of a property (e.g. order.total() instead of order.total) for type soudness with its original?
* ~~update fiddle to master~~

0.6
* implement .liveFilter, .liveMap, .liveSlice, .liveSort
* add `thisArg` to all methods that accept a function

Later

* coverage tests
* minified version
* add 'tap' function (that doesn't register as new observer)
* add 'name' as parameter to observable.value, automatically set it when defining properties, use it in warnings / toString
* browser support test https://ci.testling.com/
* Introduce mobservable.object(data) that creates observable properties and an observe method.
* react components
* should arrays trigger a notify observed for methods like reverse, sort, values, json etc? -> they change the internal structure, so that seems to be weird
* nested watcher test

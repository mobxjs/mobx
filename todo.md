
* coverage tests
* minified version
* add 'name' as parameter to observable.value, automatically set it when defining properties, use it in warnings / toString
* browser support test https://ci.testling.com/
* examples
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
        but then go to sleep if one of its dependencies has changed, so that subsequent reads on a computable are cheap even if there are no observers
    - check if somewhere an array is filled that could be preallocate
    - collapse stale / ready notifications whenever possible
    - combine multiple adds to array during batch into single splice
    - verify that combine multiple assignments to property during batch are combined into singleupdate
    - verify that multiple computations schedulings during batch result in single computation

0.4
* License
* implement array.sort & reverse properly, they do change the array
* drop mobservable.onReady / onceReady?
* clean up / clarify properties / annotations code
* drop initializeObservableProperty/ies
* introduce .props(target, prop, value), .props(props), .props(target, ...props)
* use disposable like RxJs?
* update apidocs

0.5
* Introduce mobservable.object(data) that creates observable properties and an observe method.
* react components
* should arrays trigger a notify observed for methods like reverse, sort, values, json etc? -> they change the internal structure, so that seems to be weird

0.5

* nested watcher test


0.5
* ~~test and explain nested observables~~
* observable annotation on methods should define a method instead of a property (e.g. order.total() instead of order.total) for type soudness with its original?
* mobservable.struct (ALWAYS compare deep equal, use defensive copy so that changes in object are detected). Wrap in Struct() object?
* mobservable.computedStruct

0.6
* (de)serialize complete data structure from json
* implement .liveFilter, .liveMap, , liveFlatten, .liveConcat (.liveSlice, .liveSort .get(=slice(x,1)), sum,min,max,avg,numericCount
* add `thisArg` to all methods that accept a function?

Later

* add 'tap' function (that doesn't register as new observer)
* add 'name' as parameter to observable.value, automatically set it when defining properties, use it in warnings / toString
* browser support test https://ci.testling.com/
* Introduce mobservable.object(data) that creates observable properties and an observe method.

* optimizations
    - collapse stale / ready notifications whenever possible
    - combine multiple adds to array during batch into single splice
    - verify that combine multiple assignments to property during batch are combined into singleupdate
    - verify that multiple computations schedulings during batch result in single computation
    - go to sleep if there are no observers and a 'stale' notification comes in 
    - do not wrap around .value in .props, to use save some closures 
    - create dnode.observers / observing lazy, to save memory?
    

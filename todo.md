
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
    - go to sleep if there are no observers and a 'stale' notification comes in 
    - notifyStateChange: avoid or remove scheduler.schedule, or strip closure by passing the DNode in 
    
0.4
* ~~License~~
* ~~implement array.sort & reverse properly, they do change the array~~
* ~~drop mobservable.onReady / onceReady?~~
* ~~clean up / clarify properties / annotations code~~
* ~~drop initializeObservableProperties -> turnObservablesIntoProperties ~~
* ~~introduce .props(target, prop, value), .props(props), .props(target, ...props)~~
* ~~use disposable like RxJs? -> NO ~~
* ~~props should create real observable array~~
* ~~value for array, + set -> replace~~
* ~~check nested watches! inner watch should not reevaluate outer watch, introduce DNode.unobserved that swaps out trackingstack?~~
* rename .prop. -> .impl.
* ~~replace instanceof observableValue checks with isObservable, isWrappedObservable~~
* ~~introduce createGetterSetter on all implementations~~
* make properties non-configurable
* ~~helpers .variable, computed, array~~
* ~~introduce IGetter / ISetter interfaces, or create getter setter for array~~
* fiddle demo
* update apidocs
* ~~perf tests~~
* ~~test .value etc~~
* removed .bind, it is slow!
* ~~watchClass~~
* ~~move out scheduler check stuff..~~
* ~~check batching~~
* ~~check closure usages for scheduler.schedule~~
* ~~no source map for dist!~~

0.5
* ~~browser based tests~~
* ~~fix instanceof array~~
* ~~implement + test toPlainValue~~
* ~~make browser / amd / umd build https://github.com/bebraw/grunt-umd https://github.com/umdjs/umd~~
* ~~minify~~
* react mixin, https://medium.com/@dan_abramov/mixins-are-dead-long-live-higher-order-components-94a0d2f9e750
* react fiddle demo
* bind is slow!!!

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

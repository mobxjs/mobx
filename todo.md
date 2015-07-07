
0.5
* remove pure render from jsfiddles (after release) 
* fix all the links!

https://discuss.reactjs.org/

* .props: if observablevalue, use verbatim but set scope along
* mobservable.struct (ALWAYS compare deep equal, use defensive copy so that changes in object are detected). Wrap in Struct() object?
* mobservable.computedStruct
* (de)serialize complete data structure from json
* implement .liveFilter, .liveMap, , liveFlatten, .liveConcat (.liveSlice, .liveSort .get(=slice(x,1)), sum,min,max,avg,numericCount
* add `thisArg` to all methods that accept a function?

* normalize observables ({ onNext: handleNext } => handleNext)
* think of a way to go back and forth in state? global observer?
* try to improve debugger rendering of observables
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
    

Introduce async?


enum AsyncState { PENDING, FETCHING, FETCHED }
mobservableStatic.async = function<T>(fetcher:(done:(data:T)=>void)=>T, scope?):Mobservable.IObservableValue<T> {
    var value = mobservableStatic.value<T>(undefined);
    var state = AsyncState.PENDING;
    return mobservableStatic.computed(()=>{
        if (state === AsyncState.PENDING) {
            state = AsyncState.FETCHING;
            var retVal = fetcher(fetchResult => {
                state = AsyncState.FETCHED;
                value(fetchResult);   
            });
            // if fetch happens in sync, the right value is already assigned, otherwise, initialize with the initial value optionally returned
            if (state === AsyncState.FETCHING)
                value(retVal);
        }
        // value may or may not have been assigned by the fetcher in the meantime, so lets return it        
        return value();
    }, scope);    
}
# @computed

Decorator that can be used on ES6 or TypeScript derivable class properties to make them observable.
The @computed can only be used on `get` functions for instance properties. 

Use `@computed` if you have a value that can be derived in a pure manner from other observables.

Don't confuse `@computed` with `autorun`. They are both reactively invoked expressions, 
but use `@computed` if you want to reactively produce a new value that can be used by other observers and 
`autorun` if you don't want to produce a new value but rather invoke some imperative code like logging, network requests etc.

Computed properties can be optimized away in many cases by MobX as they are assumed to be pure.
So they will not be invoked when there input parameters didn't modifiy or if they are not observed by some other computed value or autorun. 
 

```javascript
import {observable} from "mobx";

class OrderLine {
    @observable price:number = 0;
    @observable amount:number = 1;

    constructor(price) {
        this.price = price;
    }

    @computed get total() {
        return this.price * this.amount;
    }
}
```

If your environment doesn't support decorators or field initializers,
`@computed get funcName() { }` is sugar for [`extendObservable(this, { funcName: func })`](extend-observable.md)


@computed be parameterized. @computed({asStructure: true}) makes sure that the result of a derivation is compared structurally instead of referentially with its preview value. This makes sure that observers of the computation don't re-evaluate if new structures are returned that are structurally equal to the original ones. This is very useful when working with point, vector or color structures for example. It behaves the same as the asStructure modifier for observable values.

@computed properties are not enumerable.

### Enabling decorators in your transpiler

Decorators are not supported by default when using TypeScript or Babel pending a definitive definition in the ES standard.
* For _typescript_, enable the `--experimentalDecorators` compiler flag or set the compiler option `experimentalDecorators` to `true` in `tsconfig.json` (Recommended)
* For _babel5_, make sure `--stage 0` is passed to the babel CLI
* For _babel6_, see the example configuration as suggested in this [issue](https://github.com/mobxjs/mobx/issues/105)

# `computed(expression)`

`computed` can also be invoked directly as function. 
Just like `observable(primitive value)` it will create a stand-alone observable.
Use `.get()` on the returned object to get the current value of the computation, or `.observe(callback)` to observe it's changes.

Example:
```javascript
import {observable, computed} from "mobx";
var name = observable("John");
var age = observable(42);
var showAge = observable(false);

var labelText = computed(() =>
	showAge.get() ? `${name.get()} (age: ${age.get()})` : name.get();
);

var disposer = labelText.observe(newLabel => console.log(newLabel));

name.set("Dave");
// prints: 'Dave'

age.set(21);
// doesn't print

showAge.set(true);
// prints: 'Dave (age: 21)'

age.set(42);
// prints: 'Dave (age: 42)'

// cancel the observer
disposer();

name.set("Matthew");
// doesn't print anymore...

// ... but the value can still be inspected if needed.
console.log(labelText.get());
```

Note how the function now automatically reacts to data changes,
but only if they occurred in data that was actually used to produce the output.
Hence the first change to `age` didn't result in a re-evaluation of the `labelText` function.
MobX will automatically determine whether the function should run _eagerly_ or _lazily_ based on how the views are used throughout your application,
so make sure your code doesn't rely on any side effects in those functions.


---

These two forms of `observable`, one for primitives and references, and one for functions, form the core of MobX.
The rest of the api is just syntactic sugar around these two core operations.
Nonetheless, you will rarely use these forms; using objects is just a tat more convenient.

# Autorun

`mobx.autorun` can be used in those cases where you want to create a reactive function that will never have observers itself.
This is usually the case when you need to bridge from reactive to imperative code, for example for logging, persistence or UI-updating code.
When `autorun` is used, the provided function will always be triggered when one of its dependencies changes.
In contrast, `computed(function)` creates functions that only re-evaluate if it has
observers on its own, otherwise its value is considered to be irrelevant.
As a rule of thumb: use `autorun` if you have a function that should run automatically but that doesn't result in a new value.
Use `computed` for everything else. Autoruns are about initiating _effects_, not about producing new values.  
If a string is passed as first argument to `autorun`, it will be used as debug name.

Just like the [`@observer` decorator/function](./observer-component.md), `autorun` will only observe data that is used during the execution of the provided function.

```javascript
var numbers = observable([1,2,3]);
var sum = computed(() => numbers.reduce((a, b) => a + b, 0));

var disposer = autorun(() => console.log(sum.get()));
// prints '6'
numbers.push(4);
// prints '10'

disposer();
numbers.push(5);
// won't print anything, nor is `sum` re-evaluated
```


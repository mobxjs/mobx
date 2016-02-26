# Autorun

`mobx.autorun` can be used in those cases where you want to create a reactive function that will never have observers itself.
This is usually the case when you need to bridge from reactive to imperative code, for example for logging, persistence or UI-updating code.
When `autorun` is used, the provided function will always be triggered when one of its dependencies changes.
In contrast, `observable(function)` creates functions that only re-evaluate if it has
observers on its own, otherwise its value is considered to be irrelevant.
As a rule of thumb: use `autorun` if you have a function that should run automatically but that doesn't result in a new value. Use `observable` for everything else.

```javascript
var numbers = observable([1,2,3]);
var sum = observable(() => numbers.reduce((a, b) => a + b, 0));

var disposer = autorun(() => console.log(sum()));
// prints '6'
numbers.push(4);
// prints '10'

disposer();
numbers.push(5);
// won't print anything, nor is `sum` re-evaluated
```

Fun fact: `autorun(func)` is basically an alias for `observable(func).observe(() => {});`.

# Autorun

`mobx.autorun` can be used in those cases where you want to create a reactive function that will never have observers itself.
This is usually the case when you need to bridge from reactive to imperative code, for example for logging, persistence or UI-updating code.
When `autorun` is used, the provided function will always be triggered when one of its dependencies changes.
In contrast, `computed(function)` creates functions that only re-evaluate if it has
observers on its own, otherwise its value is considered to be irrelevant.
As a rule of thumb: use `autorun` if you have a function that should run automatically but that doesn't result in a new value.
Use `computed` for everything else. Autoruns are about initiating _effects_, not about producing new values.
If a string is passed as first argument to `autorun`, it will be used as debug name.

The function passed to autorun will receive one argument when invoked, the current reaction (autorun), which can be used to dispose the autorun during execution.

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

## Error handling

Exceptions thrown in autorun and all other types reactions are catched and logged to the console, but not propagated back to the original causing code.
This is to make sure that a reaction in one exception does not prevent the scheduled execution of other, possibly unrelated, reactions.
This also allows reactions to recover from exceptions; throwing an exception does not break the tracking done by MobX,
so as subsequent run of a reaction might complete normally again if the cause for the exception is removed.

It is possible to override the default logging behavior of Reactions by calling the `onError` handler on the disposer of the reaction.
Example:

```javascript
const age = observable(10)
const dispose = autorun(() => {
    if (age.get() < 0)
        throw new Error("Age should not be negative")
    console.log("Age", age.get())
})

age.set(18)  // Logs: Age 18
age.set(-10) // Logs "Error in reaction .... Age should not be negative
age.set(5)   // Recovered, logs Age 5

dispose.onError(e => {
    window.alert("Please enter a valid age")
})

age.set(-5)  // Shows alert bolx
```

A global onError handler can be set as well through `extras.onReactionError(handler)`. This can be useful in tests or for monitoring.

#Reaction

Usage: `reaction(() => data, data => { sideEffect }, fireImmediately = false, delay = 0)`.

A variation on `autorun` that gives more fine grained control on which observables will be tracked.
It takes two functions, the first one is tracked and returns data that is used as input for the second one, the side effect.
Unlike `autorun` the side effect won't be run directly when created, but only when the data expression returns a new value for the first time. 
Any observables that are accessed while executing the side effect will not be tracked.
The side effect can be debounced, just like `autorunAsync`.
`reaction` returns a disposer function.
If a string is passed as first argument to `reaction`, it will be used as debug name.

It is important to notice that the side effect will *only* react to data that was *accessed* in the data expression, which might be less then the data that is actually used in the effect.
Also, the side effect will only be triggered when the data returned by the expression has changed (the `asStructure` modifier can be used to enforce deep comparison).
In other words: reaction requires you to produce the things you need in your side effect.

In the following example both `reaction1`, `reaction2` and `autorun1` will react to the addition, removal or replacement of todo's in the `todos` array.
But only `reaction2` and `autorun` will react to the change of a `title` in one of the todo items, because `title` is used in the data expression of reaction 2, while it isn't in the data expression of reaction 1.
`autorun` tracks the complete side effect, hence it will always trigger correctly, but is also more suspectible to accidentally accessing unrelevant data.

```javascript
const todos = observable([
    {
        title: "Make coffee",
        done: true, 
    },
    {
        title: "Find biscuit",
        done: false
    }
]);

const reaction1 = reaction(
    () => todos,
    todos => console.log("reaction 1:", todos.map(todo => todo.title).join(", "))
);

const reaction2 = reaction(
    () => todos.map(todo => { title: todo.title }),
    todos => console.log("reaction 2:", todos.map(todo => todo.title).join(", "))
);

const autorun1 = autorun(
    () => console.log("autorun 1:", todos.map(todo => todo.title).join(", "))
);

todos.push({ title: "explain reactions", done: false });
// prints:
// reaction 1: Make coffee, find biscuit, explain reactions
// reaction 2: Make coffee, find biscuit, explain reactions
// autorun 1: Make coffee, find biscuit, explain reactions

todos[0].title = "Make tea"
// prints:
// reaction 2: Make tea, find biscuit, explain reactions
// autorun 1: Make tea, find biscuit, explain reactions
```

Reaction is roughly speaking sugar for: `computed(expression).observe(action(sideEffect))` or `autorun(() => action(sideEffect)(expression)`

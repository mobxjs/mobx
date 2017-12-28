const messages: { [name:string]: string } = /* TODO: process.env.NODE_ENV === "production" ? {} : */ {
    m002: "`runInAction` expects a function",
    m003: "`runInAction` expects a function without arguments",
    m004: "autorun expects a function",
    m005:
        "Warning: attempted to pass an action to autorun. Actions are untracked and will not trigger on state changes. Use `reaction` or wrap only your state modification code in an action.",
    m007:
        "reaction only accepts 2 or 3 arguments. If migrating from MobX 2, please provide an options object",
    m026: "`action` can only be invoked on functions",
    m028: "It is not allowed to set `useStrict` when a derivation is running",
    m030a:
        "Since strict-mode is enabled, changing observed observable values outside actions is not allowed. Please wrap the code in an `action` if this change is intended. Tried to modify: ",
    m030b:
        "Side effects like changing state are not allowed at this point. Are you trying to modify state from, for example, the render function of a React component? Tried to modify: ",
    m031:
        "Computed values are not allowed to cause side effects by changing observables that are already being observed. Tried to modify: ",
    m032:
        "* This computation is suspended (not in use by any reaction) and won't run automatically.\n	Didn't expect this computation to be suspended at this point?\n	  1. Make sure this computation is used by a reaction (reaction, autorun, observer).\n	  2. Check whether you are using this computation synchronously (in the same stack as they reaction that needs it).",
    m037: `Hi there! I'm sorry you have just run into an exception.
If your debugger ends up here, know that some reaction (like the render() of an observer component, autorun or reaction)
threw an exception and that mobx caught it, to avoid that it brings the rest of your application down.
The original cause of the exception (the code that caused this reaction to run (again)), is still in the stack.

However, more interesting is the actual stack trace of the error itself.
Hopefully the error is an instanceof Error, because in that case you can inspect the original stack of the error from where it was thrown.
See \`error.stack\` property, or press the very subtle "(...)" link you see near the console.error message that probably brought you here.
That stack is more interesting than the stack of this console.error itself.

If the exception you see is an exception you created yourself, make sure to use \`throw new Error("Oops")\` instead of \`throw "Oops"\`,
because the javascript environment will only preserve the original stack trace in the first form.

You can also make sure the debugger pauses the next time this very same exception is thrown by enabling "Pause on caught exception".
(Note that it might pause on many other, unrelated exception as well).

If that all doesn't help you out, feel free to open an issue https://github.com/mobxjs/mobx/issues!
`,
    m038: `Missing items in this list?
    1. Check whether all used values are properly marked as observable (use isObservable to verify)
    2. Make sure you didn't dereference values too early. MobX observes props, not primitives. E.g: use 'person.name' instead of 'name' in your computation.
`,
    m039: `The options 'struct' and 'compareStructural' are no longer supported for reactions`
}

export function getMessage(id: string): string {
    return messages[id] || `Minified exception occurred: '${id}'. Please check the mobx sources for the non minified exception or use a DEV build`
}

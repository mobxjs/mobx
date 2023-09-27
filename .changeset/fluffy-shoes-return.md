---
"mobx": major
---

Only expose IComputedValue.set as a typescript type when it won't throw an error

The breaking change is that it is now a typescript compile error to call the `set(value: T)` method on an `IComputedValue` that is not writable.
This is a breaking change because it is possible to create an `IComputedValue` that is not writable, and then call `set` on it.
This will now throw a runtime error.

This change was made to help with refactoring code, especially between `IObservableValue<T>` and `IComputedValue<T>` which both have a similar interface but one of them throws more errors.

To fix your code, you will need to change the type annotations for any updatable computed value to `IComputedValue<T, true>`.

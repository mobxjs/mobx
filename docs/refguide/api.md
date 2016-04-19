## Top level API

These are the most important functions available in the `mobx` namespace:

### [observable(value)](observable)
The `observable` function is the Swiss knife of MobX and enriches any data structure or function with observable capabilities.

### [autorun(function)](autorun)
Turns a function into an observer so that it will automatically be re-evaluated if any data value it uses changes.

### [observer(reactJsComponent)](observer-component)
The `observer` function (and ES6 decorator) from the `mobx-react` turns any ReactJS component into a reactive one.
From there on it will responds automatically to any relevant change in _observable_ data that was used by its render method.

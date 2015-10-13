## Top level api

These are the most important functions available in the `mobservable` namespace:

### [observable(value)](observble)
The `observable` function is the swiss knife of mobservable and enriches any data structure or function with observable capabilities.

### [autorun(function)](autorun)
Turns a function into an observer so that it will automatically be re-evaluated if any data values it uses changes.

### [observer(reactJsComponent)](observer-component)
The `observer` function (and ES6 decorator) from the `mobservable-react` turns any Reactjs component into a reactive one.
From there on it will responds automatically to any relevant change in _observable_ data that was used by its render method.

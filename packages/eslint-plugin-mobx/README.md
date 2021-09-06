# eslint-plugin-mobx

## Installation

```
npm install --save-dev eslint @typescript-eslint/parser eslint-plugin-mobx 
```

## Configuration

```
// .eslintrc.js
module.exports = {
    parser: "@typescript-eslint/parser",
    // Include "mobx" in plugins array:
    plugins: ["mobx"],        
    // Either extend our recommended configuration:
    extends: "plugin:mobx/recommended",
    // ...or specify and customize individual rules:
    rules: {
      // these values are the same as recommended
      'mobx/exhaustive-make-observable': 'warn',      
      'mobx/missing-make-observable': 'error',
      'mobx/unconditional-make-observable': 'error',
      'mobx/no-arrow-render': 'error',
    },
};
```

## Rules

### mobx/exhaustive-make-observable

Makes sure that `makeObservable` annotates all fields defined on class or object literal.
Autofix adds `field: true` for each missing field.
To exclude a field, annotate it using `field: false`.
Does not support fields introduced by constructor (`this.foo = 5`).
Does not warn about annotated non-exsiting fields (there is a runtime check, but the autofix removing the field could be handy...).

### mobx/missing-make-observable

*When using decorators (eg `@observable foo = 5`)*, makes sure that `makeObservable(this)` is being called in a constructor.

### mobx/unconditional-make-observable

Makes sure the `make(Auto)Observable(this)` is called unconditionally inside a constructor.

### mobx/no-render-expression

When using react's class components, the `observer` requires `render` being a method defined on prototype, rather than own property with a function expression `render = () => {}`/`render = function() {}`.
Class component is considered anything that extends from `Component`, `PureComponent`, `React.Component`, `React.PureComponent`.
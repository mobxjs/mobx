# eslint-plugin-mobx

Mobx specific linting rules for `eslint`.

## Installation

```
npm install --save-dev eslint @typescript-eslint/parser eslint-plugin-mobx
```

Requires ESLint 9 or 10. For ESLint 8 or older, use `eslint-plugin-mobx` 0.2.x.

## Configuration

```javascript
// eslint.config.js
import pluginMobx from "eslint-plugin-mobx"

export default [
    // ...

    // Either extend our recommended configuration:
    pluginMobx.configs.recommended,

    // ...or specify and customize individual rules:
    {
        plugins: { mobx: pluginMobx },
        rules: {
            // these values are the same as recommended
            "mobx/exhaustive-make-observable": "warn",
            "mobx/unconditional-make-observable": "error"
        }
    }
]
```

## Rules

### mobx/exhaustive-make-observable

Makes sure that `makeObservable` annotates all fields defined on class or object literal.<br>
To exclude a field, annotate it using `field: false`.<br>
Members with MobX decorators are skipped, they are already annotated.<br>
Also reports `makeObservable` called without annotations, which throws in MobX 7.<br>
Does not support fields introduced by constructor (`this.foo = 5`).<br>
Does not warn about annotated non-existing fields (there is a runtime check, but the autofix removing the field could be handy...).<br>
**Autofix** adds `field: true` for each missing field by default. You can change this behaviour by specifying options in your eslint config:

```json
{
    "rules": {
        "mobx/exhaustive-make-observable": ["error", { "autofixAnnotation": false }]
    }
}
```

This is a boolean value that controls if the field is annotated with `true` or `false`.
If you are migrating an existing project using `makeObservable` and do not want this rule to override
your current usage (even if it may be wrong), you should run the autofix with the annotation set to `false` to maintain existing behaviour: `eslint --fix --rule='mobx/exhaustive-make-observable: [2, { "autofixAnnotation": false }]' .`

### mobx/unconditional-make-observable

Makes sure the `make(Auto)Observable(this)` is called unconditionally inside a constructor.

### mobx/no-anonymous-observer (deprecated)

_Deprecated in favor of [react/display-name](https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/display-name.md) + [componentWrapperFunctions](https://github.com/jsx-eslint/eslint-plugin-react). Example of **eslint.config.js**:_

```javascript
export default [
    // ...
    {
        rules: {
            "react/display-name": "warn"
        },
        settings: {
            componentWrapperFunctions: ["observer"]
        }
    }
]
```

---

Forbids anonymous functions or classes as `observer` components.
Improves debugging experience and [avoids problem with inability to customize `displayName`](https://github.com/mobxjs/mobx/issues/2721).
Plays nice with `eslint-plugin-react-hooks`, which doesn't recognize anonymous functions as components.
**Autofix** infers the name from variable if possible.

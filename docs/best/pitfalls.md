---
sidebar_label: Common Pitfalls & Best Practices
title: Common pitfalls & best practices
hide_title: true
---

# Common pitfalls & best practices

Stuck with MobX? This section contains a list of common issues people new to MobX might run into.

#### Importing from wrong location

Because MobX ships with typescript typings out of the box, some import autocompleting tools (at least in VSCode) have the habit of auto completing with a wrong import, like

```javascript
// wrong
import { observable } from "mobx/lib/mobx"
```

This is incorrect but will not always immediately lead to runtime errors. So be aware. The only correct way of importing anything from the `mobx` package is:

```javascript
// correct
import { observable } from "mobx"
```

### `@inject('store')` before `@observer` will cause MobX to not trigger

The effect with React is that the it will never render on observable changes.

This is wrong

```typescript
@observer
@inject('store')
```

It must be

```typescript
@inject('store')
@observer
```

You'll notice a warning

```
Mobx observer: You are trying to use 'observer' on a component that already has 'inject'. Please apply 'observer' before applying 'inject'
```

#### I have a weird exception when using `@observable` in a React component.

The following exception: `Uncaught TypeError: Cannot assign to read only property '__mobxLazyInitializers' of object` occurs when using a `react-hot-loader` that does not support decorators.
Either use `extendObservable` in `componentWillMount` instead of `@observable`, or upgrade to `react-hot-loader` `"^3.0.0-beta.2"` or higher.

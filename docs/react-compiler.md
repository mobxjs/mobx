---
title: MobX and React Compiler
sidebar_label: React Compiler
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# MobX and React Compiler

[React Compiler](https://react.dev/learn/react-compiler) and MobX both avoid unnecessary re-rendering, but they do it in incompatible ways. MobX tracks the observable objects a component reads at runtime and re-renders it when they change; the objects keep their identity while their contents change. React Compiler memoizes render expressions based on statically inferred dependencies and treats values with a stable identity as unchanged.

Compiling an `observer` component is therefore not safe:

```javascript
export const CounterView = observer(() => {
    const count = counterStore.count
    return <div>{count}</div>
})
```

React Compiler caches the JSX of `CounterView`. When `counterStore.count` changes, MobX correctly schedules a re-render, the component runs again, but the compiler returns the JSX it cached during the first render. The DOM stays stale and nothing warns you.

## The solution: leave observed components to MobX

React offers the [`"use no memo"` directive](https://react.dev/reference/react-compiler/directives/use-no-memo) to exclude a function from compilation. Inside an `observer` component MobX already owns memoization and invalidation, so every observed component should carry the directive:

```javascript
export const TodoList = observer(function TodoList() {
    "use no memo"

    return store.todos.map(todo => <Todo key={todo.id} todo={todo} />)
})
```

Writing this by hand for every component is tedious and easy to forget. The [`mobx-react-plugin`](https://github.com/mobxjs/mobx/tree/main/packages/mobx-react-plugin) package does it at build time: it wraps every React component in your source files in `observer` and inserts the directive, so you simply write:

```javascript
export function TodoList() {
    return store.todos.map(todo => <Todo key={todo.id} todo={todo} />)
}
```

```javascript
// vite.config.ts
import { defineConfig } from "vite"
import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import babel from "@rolldown/plugin-babel"
import mobxReactPlugin from "mobx-react-plugin/vite"

export default defineConfig({
    plugins: [mobxReactPlugin(), react(), babel({ presets: [reactCompilerPreset()] })]
})
```

```javascript
// babel.config.js (React Native / Expo, webpack, ...)
module.exports = {
    presets: ["module:@react-native/babel-preset"],
    plugins: [["mobx-react-plugin/babel", {}], "babel-plugin-react-compiler"]
}
```

The plugin must run before React Compiler. See the [package documentation](https://github.com/mobxjs/mobx/tree/main/packages/mobx-react-plugin) for other bundlers and options.

## What this does and does not mean

You can enable React Compiler alongside MobX so observed components are explicitly left to MobX. React Compiler optimizes everything else: components you exclude from the transform and components that opt in with `"use memo"`.

React Compiler does not optimize the inside of observer components. MobX already does that work, and asking a second memoization system to reinterpret the same render with incompatible assumptions has little value. In an application where most components are observed, React Compiler will have relatively little left to optimize. That is an accepted tradeoff.

## Custom hooks

React Compiler also memoizes all the custom hooks you write. That is why `mobx-react-plugin` inserts `"use no memo"` into them by default: a hook that uses a MobX store would otherwise return stale values, because the compiler caches them against the stable identity of the store.

```javascript
function useVisibleTodos() {
    const store = useStore()
    return store.todos.filter(todo => todo.visible) // cached by React Compiler, goes stale
}
```

If none of your custom hooks use MobX stores, you can let React Compiler keep optimizing them by passing `mobxReactPlugin({ observer: { useNoMemoHooks: false } })` in your bundler config.

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

React Compiler caches the JSX of `CounterView`. When `counterStore.count` changes, MobX correctly schedules a re-render, but the compiler returns the JSX it cached during the first render. The DOM stays stale and nothing warns you.

## The solution: leave observed components to MobX

React's [`"use no memo"` directive](https://react.dev/reference/react-compiler/directives/use-no-memo) excludes a function from compilation, so every observed component should carry it. Instead of writing it by hand, let [`mobx-react-plugin`](https://github.com/mobxjs/mobx/tree/main/packages/mobx-react-plugin) add it at build time. This code:

```javascript
export function TodoList() {
    return store.todos.map(todo => <Todo key={todo.id} todo={todo} />)
}
```

is compiled into:

```javascript
import { observer } from "mobx-react-plugin/observer"

export const TodoList = observer(function TodoList() {
    "use no memo"

    return store.todos.map(todo => <Todo key={todo.id} todo={todo} />)
})
```

Setup:

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

## Custom hooks

React Compiler memoizes custom hooks too, so a hook that reads a MobX store goes stale the same way:

```javascript
function useVisibleTodos() {
    const store = useStore()
    return store.todos.filter(todo => todo.visible) // cached by React Compiler, goes stale
}
```

The plugin inserts `"use no memo"` into hooks as well.

## Opting out

MobX already memoizes observed components, so in an application where most components are observed, React Compiler has little left to optimize. That is an accepted tradeoff. To hand code that does not read observables back to React Compiler:

-   Exclude a folder or a UI library: `mobxReactPlugin({ exclude: ["src/ui/**"] })`.
-   Start a component or hook with `"use memo"`. The plugin then neither wraps it in `observer` nor inserts `"use no memo"`.
-   If none of your hooks read observables, pass `mobxReactPlugin({ observer: { useNoMemoHooks: false } })`.

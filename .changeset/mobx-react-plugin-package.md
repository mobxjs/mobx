---
"mobx-react-plugin": major
---

`mobx-react-plugin` becomes an official MobX package (successor of `mobx-react-observer`): a Babel plugin (`mobx-react-plugin/babel`, for Vite, webpack, Rspack, Metro / React Native, Expo, Next.js, Jest) and a Vite plugin (`mobx-react-plugin/vite`) that automatically wrap React components in `observer`, insert the `"use no memo"` directive so React Compiler leaves observed components (and custom hooks) to MobX, and turn `async` methods of observable classes and objects into MobX flows. Each feature can be switched off (`observer`, `flow`).

Compared to `mobx-react-observer` 2.x by Christian Alfoni: `observer` is imported from `mobx-react-lite` directly (`importSource` option), arrow components keep their name in React DevTools, `forwardRef`/`memo` are handled correctly, components that are passed to `observer(...)` elsewhere are not wrapped twice, recursive components stay observed, and the transform runs in `Program:enter` so it reliably runs before `babel-plugin-react-compiler`. The Vite entry point moved from `mobx-react-observer/vite-plugin` to `mobx-react-plugin/vite`.

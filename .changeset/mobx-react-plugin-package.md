---
"mobx-react-plugin": major
---

Add `mobx-react-plugin`, a build plugin that wraps React components in `observer`, adds the `"use no memo"` directive so React Compiler leaves observed components to MobX, and turns `async` methods of observable classes and objects into MobX flows. Each feature can be switched off. It is a Babel plugin (`mobx-react-plugin/babel`), plus a Vite plugin (`mobx-react-plugin/vite`) that runs it before any React plugin.

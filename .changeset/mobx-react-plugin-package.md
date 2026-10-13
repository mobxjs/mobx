---
"mobx-react-plugin": major
---

Add `mobx-react-plugin`, a build-time plugin that wraps React components in `observer`, adds the `"use no memo"` directive so React Compiler leaves observed components to MobX, and turns `async` methods of observable classes and objects into MobX flows. Each feature can be switched off. It ships as a Babel plugin (`mobx-react-plugin/babel`) and a Vite plugin (`mobx-react-plugin/vite`).

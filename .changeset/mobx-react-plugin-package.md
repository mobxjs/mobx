---
"mobx-react-plugin": major
---

Add `mobx-react-plugin`, the official MobX plugin for React projects. It is a Babel plugin (`mobx-react-plugin/babel`) and a Vite plugin (`mobx-react-plugin/vite`) that wrap React components in `observer`, add the `"use no memo"` directive so React Compiler leaves observed components to MobX, and turn `async` methods of observable classes and objects into MobX flows. Each feature can be switched off.

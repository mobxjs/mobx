---
"mobx-react-plugin": major
---

Add `mobx-react-plugin`, which wraps React components in `observer`, adds the `"use no memo"` directive so React Compiler leaves observed components to MobX, and turns `async` methods of observable classes and objects into MobX flows. Each feature can be switched off.

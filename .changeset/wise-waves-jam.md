---
"mobx-react": major
---

Functional components now use `useSyncExternalStore`, which should prevent tearing - you have to update mobx, otherwise it should behave as previously.<br>
Improved displayName/name handling of functional components as discussed in #3438.<br>
Reactions of uncommited class components are now correctly disposed, fixes #3492.<br>
Reactions don't notify uncommited class components, avoiding the warning, fixes #3492.<br>
Removed symbol "polyfill" and replaced with actual Symbols.<br>
Removed `this.render` replacement detection + warning. `this.render` is no longer configurable/writable (possibly BC).<br>
Class component instance is no longer exposed as `component[$mobx]["reactcomponent"]` (possibly BC).<br>
Deprecated `disposeOnUnmount`, it's not compatible with remounting.<br>

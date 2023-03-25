---
"mobx-react-lite": major
---

Components now use `useSyncExternalStore`, which should prevent tearing - you have to update mobx, otherwise it should behave as previously.<br>
Improved displayName/name handling as discussed in #3438.<br>

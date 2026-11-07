---
"mobx": patch
---

`computed(fn, { requiresReaction: true })` now throws when it is read outside a reactive context, as the docs describe, instead of logging a warning in development and silently recomputing. The check runs in production builds too. The global `computedRequiresReaction` option still only warns.

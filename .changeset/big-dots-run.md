---
"mobx": minor
---

Adds a global flag for computed `keepAlive` default value:
`configure({ globalKeepAliveState })`

Current behavior is preserved by default (`globalKeepAliveState: false`),
explicit `keepAlive` still takes precedence

Computed keepAlive now resolves in this order:

1. explicit `keepAlive`
2. `configure({ globalKeepAliveState })`
3. default `true`

MobX now warns once when a computed is created without an explicit `keepAlive`, to help prepare for the next major version where the default will change.

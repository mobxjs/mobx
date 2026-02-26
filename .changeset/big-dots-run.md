---
"mobx": minor
---

Adds a temporary global migration flag for computed `keepAlive` default value:
`configure({ globalKeepAliveState })`

Current behavior is preserved by default (`globalKeepAliveState: false`),
explicit `keepAlive` still takes precedence

MobX now warns once when a computed is created without an explicit `keepAlive`, to help prepare for the next major version where the default will change.

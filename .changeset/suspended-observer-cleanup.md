---
"mobx-react-lite": patch
---

Clean up reactions from uncommitted observer renders using the existing timed fallback even when native finalization is available. This releases subscriptions retained by suspended renders while preserving reactivity on retry.

In environments with native finalization, defer cleanup registration to a shared microtask so synchronous subscriptions avoid native registrations and timers.

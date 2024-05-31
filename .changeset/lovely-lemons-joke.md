---
"eslint-plugin-mobx": patch
---

Adds an option for the `mobx/exhaustive-make-observable` eslint rule to configure whether fields are annotated with `true` or `false` with the autofixer.

This option defaults to `true` if not present or an invalid value is received to maintain existing behavior.

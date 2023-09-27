---
"mobx": major
---

Clarify which options are actually supported in each observable factory function.

This change was made as a way to reduce the cognitive load on users while specifying the options when calling observable.box(...), etc...

A user might be confused why some options don't seem to do anything.

To update user code, the now statically disallowed options should merely be removed, they weren't used anyway.

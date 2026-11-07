---
"mobx-react-plugin": patch
---

Faster transforms: files that cannot contain components, hooks or flows are skipped without being parsed, and the Vite plugin only generates code when something changed. Code generation options for the Vite plugin now go in `babel.generatorOpts`.

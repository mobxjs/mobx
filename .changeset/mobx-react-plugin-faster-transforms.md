---
"mobx-react-plugin": patch
---

Faster transforms. The Vite plugin no longer parses files that cannot contain components, hooks or flows, stops the Babel traversal at `Program` and only generates code when something changed; the Babel plugin skips its analysis for such files as well. A full `vite build` of a 380 file app spends less than half the time in the plugin.

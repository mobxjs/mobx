---
"mobx-react": major
---

Removed the deprecated PropTypes export, as React 19 no longer provides the types `React.Requireable` and `React.Validator`, and this was causing TypeScript errors with `@types/react@19.0.10`.

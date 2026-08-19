---
"mobx-react-lite": patch
---

fix: `useObserver` no longer retains the element tree returned by a component's first render for the component's whole mounted life. `subscribe`/`getSnapshot` were created inside `useObserver`'s first invocation and therefore shared that invocation's closure context with the `reaction.track` callback's captures (`render`, `renderResult`); since React's `useSyncExternalStore` holds `subscribe` while the component is mounted, the first render result (and every fiber and DOM node reachable from it) could never be garbage collected. The administration object is now created by a module-level factory whose scope contains nothing render-related.

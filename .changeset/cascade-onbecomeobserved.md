---
"mobx": patch
---

fix: `onBecomeObserved` is now called for the dependencies of a computed that becomes observed while serving a cached value. Previously, observation only cascaded when the newly observed computed also happened to recompute, so an observable with a live observer chain up to a running reaction could still report itself as unobserved and never fire its hook.

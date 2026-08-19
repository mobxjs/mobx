---
"mobx": patch
---

Fix `ObservableSet.replace` emitting spurious `delete`/`add` events (and triggering reactions) for values that are unchanged. It now only fires `delete` for removed values and `add` for newly added ones, mirroring `ObservableMap.replace`.

Note: because `replace` no longer clears and re-adds every value, the iteration order after `replace` changes in a (subtle but observable) way. Surviving values now keep their original relative position and newly added values are appended, instead of the whole set being reordered to match the argument. For example, `set(["a", "b", "c"]).replace(["d", "b", "a"])` previously iterated as `d, b, a`, and now iterates as `a, b, d`. This is arguably the more correct behavior (unchanged values are genuinely unchanged), but if you relied on `replace` reordering the set to match its argument, you may need to adjust.

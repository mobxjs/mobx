---
"mobx": patch
---

Release the internal key subscriptions of observable objects once they are no longer observed. Reading a missing property or checking `key in obj` inside a reaction created an entry that was kept for the lifetime of the object, so objects used as dynamic dictionaries grew with every key ever looked up. `ObservableMap` already cleaned up its equivalent `has` entries.

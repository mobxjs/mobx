---
title: Collection utilities
sidebar_label: Collection utilities {🚀}
hide_title: true
---

<script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=CEBD4KQ7&placement=mobxjsorg" id="_carbonads_js"></script>

# Collection utilities {🚀}

They enable manipulating observable arrays, objects and Maps with the same generic API.
These APIs are fully reactive, which means that even [without `Proxy` support](configuration.md#limitations-without-proxy-support) new property declarations can be detected by MobX if `set` is used to add them, and `values` or `keys` are used to iterate over them.

Another benefit of `values`, `keys` and `entries` is that they return arrays rather than iterators, which makes it possible to, for example, immediately call `.map(fn)` on the results.

All that being said, a typical project has little reason to use these APIs.

Access:

-   `values(collection)` returns an array of all the values in the collection.
-   `keys(collection)` returns an array of all the keys in the collection.
-   `entries(collection)` returns an array of all the entries `[key, value]` pairs in the collection.

Mutation:

-   `set(collection, key, value)` or `set(collection, { key: value })` update the given collection with the provided key / value pair(s).
-   `remove(collection, key)` removes the specified child from the collection. Splicing is used for arrays.
-   `has(collection, key)` returns _true_ if the collection has the specified _observable_ property.
-   `get(collection, key)` returns the child under the specified key.

If you use the access APIs in an environment without `Proxy` support, then also use the mutation APIs so they can detect the changes.

```javascript
import { autorun, get, set, observable, values } from "mobx"

const twitterUrls = observable.object({
    Joe: "twitter.com/joey"
})

autorun(() => {
    // Get can track not yet existing properties.
    console.log(get(twitterUrls, "Sara"))
})

autorun(() => {
    console.log("All urls: " + values(twitterUrls).join(", "))
})

set(twitterUrls, { Sara: "twitter.com/horsejs" })
```

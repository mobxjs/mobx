---
sidebar_label: Object api
title: Object api
hide_title: true
---

## Direct Observable manipulation

<div id='codefund'></div><div class="re_2020"><a class="re_2020_link" href="https://www.react-europe.org/#slot-2149-workshop-typescript-for-react-and-graphql-devs-with-michel-weststrate" target="_blank" rel="sponsored noopener"><div><div class="re_2020_ad" >Ad</div></div><img src="/img/reacteurope.svg"><span>Join the author of MobX at <b>ReactEurope</b> to learn how to use <span class="link">TypeScript with React</span></span></a></div>

There is now an utility API that enables manipulating observable maps, objects and arrays with the same API. These api's are fully reactive, which means that even new property declarations can be detected by mobx if `set` is used to add them, and `values` or `keys` to iterate them.

-   **`values(thing)`** returns all values in the collection as array
-   **`keys(thing)`** returns all keys in the collection as array
-   **`entries(thing)`** returns a [key, value] pair for all entries in the collection as array

The following methods are not really necessary when using MobX 5, but can be used to achieve MobX-5-like behavior in MobX 4.

-   **`set(thing, key, value)`** or **`set(thing, { key: value })`** Updates the given collection with the provided key / value pair(s).
-   **`remove(thing, key)`** removes the specified child from the collection. For arrays splicing is used.
-   **`has(thing, key)`** returns true if the collection has the specified _observable_ property.
-   **`get(thing, key)`** returns the child under the specified key.

```javascript
import { get, set, observable, values } from "mobx"

const twitterUrls = observable.object({
    John: "twitter.com/johnny"
})

autorun(() => {
    console.log(get(twitterUrls, "Sara")) // get can track not yet existing properties
})

autorun(() => {
    console.log("All urls: " + values(twitterUrls).join(", "))
})

set(twitterUrls, { Sara: "twitter.com/horsejs" })
```

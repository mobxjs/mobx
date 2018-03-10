## Direct Observable manipulation

There is now an utility API that enables manipulating observable maps, objects and arrays with the same API. These api's are fully reactive, which means that even new property declarations can be detected by mobx if `set` is used to add them, and `values` or `keys` to iterate them.

  * **`values(thing)`** returns all values in the collection as array
  * **`keys(thing)`** returns all keys in the collection as array
  * **`set(thing, key, value)`** or **`set(thing, { key: value })`** Updates the given collection with the provided key / value pair(s).
  * **`remove(thing, key)`** removes the specified child from the collection. For arrays splicing is used.
  * **`has(thing, key)`** returns true if the collection has the specified _observable_ property.
  * **`get(thing, key)`** returns the chlid under the specified key.


```javascript
import { get, set, observable, values } from "mobx"

const twitterUrls = observable.object({
    "John": "twitter.com/johnny"
})

autorun(() => {
    console.log(get(twitterUrls, "Sara")) // get can track not yet existing properties
})

autorun(() => {
    console.log("All urls: " + values(twitterUrls).join(", "))
})

set(twitterUrls, { "Sara" : "twitter.com/horsejs"})
```
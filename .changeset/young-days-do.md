---
"mobx-react-lite": patch
---

Fix use of react-dom vs react-native

The `es` folder content is compiled only without transpilation to keep `utils/reactBatchedUpdates` which exists in DOM and RN versions. The bundled `esm` is still kept around too, especially the prod/dev ones that should be utilized in modern browser environments.

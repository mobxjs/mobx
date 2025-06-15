---
"mobx": patch
---

Fixed memory leak where makeAutoObservable would keep wrapping setters defined on the prototype. Fixes #4553

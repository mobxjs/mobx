---
"mobx": major
---

`computed`s are now kept alive by default (`keepAlive: true`)
This changes unobserved computed behaviour - values stay cached instead being suspended or recomputed for each untracked read
If you rely on previous behaviour, set "keepAlive: false" explicitly

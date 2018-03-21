# @observable

<a style="color: white; background:green;padding:5px;margin:5px;border-radius:2px" href="https://egghead.io/lessons/javascript-sync-the-ui-with-the-app-state-using-mobx-observable-and-observer-in-react">egghead.io lesson 1: observable & observer</a>
<a style="color: white; background:green;padding:5px;margin:5px;border-radius:2px"  href="https://egghead.io/lessons/react-use-observable-objects-arrays-and-maps-to-store-state-in-mobx">egghead.io lesson 4: observable objects & maps</a>


Decorator that can be used on ES7- or TypeScript class properties to make them observable.
The `@observable` can be used on instance fields and property getters.
This offers fine-grained control on which parts of your object become observable.

```javascript
import { observable, computed } from "mobx";

class OrderLine {
    @observable price = 0;
    @observable amount = 1;

    @computed get total() {
        return this.price * this.amount;
    }
}
```

If your environment doesn't support decorators or field initializers,
use `decorate` instead (see [decorators](./modifiers.md) for details).

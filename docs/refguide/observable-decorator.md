# @observable

Decorator that can be used on ES6 or TypeScript class properties to make them observable.
The @observable can be used on instance fields and property getters.
This offers fine-grained control on which parts of your object should become observable.

```javascript
import {observable} from "mobservable";

class OrderLine {
    @observable price:number = 0;
    @observable amount:number = 1;

    constructor(price) {
        this.price = price;
    }

    @observable get total() {
        return this.price * this.amount;
    }
}
```

If your environment doesn't support decorators or field initializers,
`@observable key = value;` is sugar for [`extendObservable(this, { key: value })`](extend-observable.md)

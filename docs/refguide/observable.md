# @observable

Decorator (a.k.a. annotation) that can be used on ES6 or TypeScript class properties to make them reactive.
The @observable can be used on field initializer and on `get` getter functions for properties.

Note that in ES6 the annotation can only be used on getter functions, as ES6 doesn't support property initializers in class declarations.
See also the [syntax section](syntax.md) to see how `@observable` can be combined with different flavors of javascript code.

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
`@observable key = value;` is sugar for [`extendReactive(this, { key: value })`](extend-reactive.md) 
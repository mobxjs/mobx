# @observable

Decorator that can be used on ES7- or TypeScript class properties to make them observable.
The @observable can be used on instance fields and property getters.
This offers fine-grained control on which parts of your object become observable.

```javascript
import {observable} from "mobx";

class OrderLine {
    @observable price = 0;
    @observable amount = 1;

    @computed get total() {
        return this.price * this.amount;
    }
}
```

If your environment doesn't support decorators or field initializers,
`@observable key = value;` is sugar for [`extendObservable(this, { key: value })`](extend-observable.md)

Note: all the properties are being defined lazily as soon as any of them is accessed. Before that they are only defined on the class prototype  

In other words:

```javascript
const line = new OrderLine();
console.log("price" in line); // true
console.log(line.hasOwnProperty("price")); // false, the price _property_ is defined on the class, although the value will be stored per instance.
line.amount = 2;
console.log(line.hasOwnProperty("price")); // true, now all the properties are defined on the instance 
```

The `@observable` decorator can be combined with modifiers like `asStructure`:

```javascript
@observable position = asStructure({ x: 0, y: 0})
```


### Enabling decorators in your transpiler

Decorators are not supported by default when using TypeScript or Babel pending a definitive definition in the ES standard.
* For _typescript_, enable the `--experimentalDecorators` compiler flag or set the compiler option `experimentalDecorators` to `true` in `tsconfig.json` (Recommended)
* For _babel5_, make sure `--stage 0` is passed to the Babel CLI
* For _babel6_, see the example configuration as suggested in this [issue](https://github.com/mobxjs/mobx/issues/105)

# Transaction

_Transaction has been deprecated in favor of *action* or *runInAction*_

`transaction(worker: () => void)` can be used to batch a bunch of updates without notifying any observers until the end of the transaction.
`transaction` takes a single, parameterless `worker` function as argument and runs it.
No observers are notified until this function has completed.
`transaction` returns any value that was returned by the `worker` function.
Note that `transaction` runs completely synchronously.
Transactions can be nested. Only after completing the outermost `transaction` pending reactions will be run.

```javascript
import {observable, transaction, autorun} from "mobx";

const numbers = observable([]);

autorun(() => console.log(numbers.length, "numbers!"));
// Prints: '0 numbers!'

transaction(() => {
	transaction(() => {
		numbers.push(1);
		numbers.push(2);
	});
	numbers.push(3);
});
// Prints: '3 numbers!'
```

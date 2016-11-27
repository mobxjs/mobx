//@flow

import type { IObservableValue, IObservableArray, IComputedValue } from 'mobx';
import mobx from 'mobx';


const action = mobx.action(() => console.log(1));
// $ExpectError
const isAction: string = mobx.isAction(action);

const observableValue: IObservableValue<number> = mobx.observable(1);
// $ExpectError
const initialValue: string = observableValue.get();


const observableArray: IObservableArray<number> = mobx.observable([1,2,3]);
// $ExpectError
const initialArray: Array<string> = observableArray.peek();

const sum: IComputedValue<any> = mobx.computed(() => {
  return observableArray.reduce((a: number, b: number): number => {
    return a + b;
  }, 0);
});

const disposer = mobx.autorun(() => console.log(sum.get()));
disposer();


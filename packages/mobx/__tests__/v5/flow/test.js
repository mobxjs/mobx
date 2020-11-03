//@flow

import type { IObservableValue, IObservableArray, IComputedValue } from "../../../dist/index.js"
import * as mobx from "../../../dist/index.js"

const action = mobx.action(() => console.log(1))
// $ExpectError
const isAction: string = mobx.isAction(action)

const observableValue: IObservableValue<number> = mobx.observable.box(1)
// $ExpectError
const initialValue: string = observableValue.get()

const observableArray: IObservableArray<number> = mobx.observable([1, 2, 3])
// $ExpectError
const initialArray: Array<string> = observableArray.peek()

const sum: IComputedValue<number> = mobx.computed(() => {
    return observableArray.reduce((a: number, b: number): number => {
        return a + b
    }, 0)
})

const observableObject = mobx.observable({
    a: true
})
// $ExpectError
observableObject.a = 12
// $ExpectError
observableObject.b = 12
observableObject.a = false

const extendedObservableObject = mobx.extendObservable(mobx.observable({}), { a: true })
// $ExpectError
const x: string = extendedObservableObject.a

const disposer = mobx.autorun(() => console.log(sum.get()))
disposer()

const emptyArray = observable([])
const arr = observable([1])
const object = observable.map({
    nestedValue: arr
})

object.get("nestedValue").push(1)
const y: number = object.get("nestedValue")[0]

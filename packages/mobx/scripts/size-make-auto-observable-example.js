import { autorun, makeAutoObservable } from "mobx"

class Store {
    count = 1

    constructor() {
        makeAutoObservable(this)
    }

    get doubled() {
        return this.count * 2
    }

    increment() {
        this.count += 1
    }
}

const state = new Store()
const dispose = autorun(() => {
    console.log(state.doubled)
})

state.increment()
dispose()

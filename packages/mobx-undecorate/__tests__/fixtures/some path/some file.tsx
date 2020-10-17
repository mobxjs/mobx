import { observable, makeObservable } from "mobx"
class Test {
    x = 1

    constructor() {
        makeObservable(this, {
            x: observable
        })
    }
}

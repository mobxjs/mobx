import { observable } from "mobx"

class Box {
    /*0*/
    @observable
    /*1*/
    field /*2 */ = /*3*/ 1 /*4*/
}

class ExtendsHasMethod extends Box {
    @observable x = 1

    // test
    method() {
        console.log("hi")
    }
}

class ExtendsHasConstructor {
    @observable x = 1

    constructor() {
        console.log("hi")
    }
}

class ExtendsHasConstructorSuper extends Box {
    @observable x = 1

    constructor() {
        super()
        console.log("hi")
    }
}

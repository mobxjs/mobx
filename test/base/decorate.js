// @ts-check

import {
    observable,
    computed,
    transaction,
    autorun,
    extendObservable,
    action,
    isObservableObject,
    observe,
    isObservable,
    isObservableProp,
    isComputedProp,
    spy,
    isAction,
    decorate
} from "../../src/mobx"

test("decorate should work", function() {
    class Box {
        // @ts-ignore
        uninitialized
        height = 20
        sizes = [2]
        someFunc = function() {
            return 2
        }
        get width() {
            return (
                this.undeclared *
                this.height *
                this.sizes.length *
                this.someFunc() *
                (this.uninitialized ? 2 : 1)
            )
        }
        addSize() {
            // @ts-ignore
            this.sizes.push([3])
            // @ts-ignore
            this.sizes.push([4])
        }
        constructor() {
            this.undeclared = 1
        }
    }

    decorate(Box, {
        uninitialized: observable,
        undeclared: observable,
        height: observable,
        sizes: observable,
        someFunc: observable,
        width: computed,
        addSize: action
    })

    var box = new Box()
    expect(isObservableObject(box)).toBe(true)
    expect(box.uninitialized).toBe(undefined)
    expect(box.height).toBe(20)
    expect(isObservableProp(box, "uninitialized")).toBe(true)
    expect(isObservableProp(box, "height")).toBe(true)
    expect(isObservableProp(box, "sizes")).toBe(true)
    expect(isObservable(box.sizes)).toBe(true)
    expect(isObservableProp(box, "someFunc")).toBe(true)
    expect(isComputedProp(box, "width")).toBe(true)
    expect(isAction(box.addSize)).toBe(true)

    var ar = []

    autorun(() => {
        ar.push(box.width)
    })

    expect(ar.slice()).toEqual([40])
    box.height = 10
    expect(ar.slice()).toEqual([40, 20])
    box.sizes.push(3, 4)
    expect(ar.slice()).toEqual([40, 20, 60])
    box.someFunc = () => 7
    expect(ar.slice()).toEqual([40, 20, 60, 210])
    box.uninitialized = true
    expect(ar.slice()).toEqual([40, 20, 60, 210, 420])
    box.addSize()
    expect(ar.slice()).toEqual([40, 20, 60, 210, 420, 700])
    box.undeclared = 2
    expect(ar.slice()).toEqual([40, 20, 60, 210, 420, 700, 1400])

    const box2 = new Box()
    expect(box2.width).toBe(40) // no shared state!
})

test("decorate should work with plain object", function() {
    const box = {
        uninitialized: undefined,
        height: 20,
        sizes: [2],
        someFunc: function() {
            return 2
        },
        get width() {
            return (
                this.undeclared *
                this.height *
                this.sizes.length *
                this.someFunc() *
                (this.uninitialized ? 2 : 1)
            )
        },
        addSize() {
            // @ts-ignore
            this.sizes.push([3])
            // @ts-ignore
            this.sizes.push([4])
        }
    }

    decorate(box, {
        uninitialized: observable,
        undeclared: observable,
        height: observable,
        sizes: observable,
        someFunc: observable,
        width: computed,
        addSize: action
    })
    box.undeclared = 1

    expect(isObservableObject(box)).toBe(true)
    expect(box.uninitialized).toBe(undefined)
    expect(box.height).toBe(20)
    expect(isObservableProp(box, "uninitialized")).toBe(true)
    expect(isObservableProp(box, "height")).toBe(true)
    expect(isObservableProp(box, "sizes")).toBe(true)
    expect(isObservable(box.sizes)).toBe(true)
    expect(isObservableProp(box, "someFunc")).toBe(true)
    expect(isComputedProp(box, "width")).toBe(true)
    expect(isAction(box.addSize)).toBe(true)

    var ar = []

    autorun(() => {
        ar.push(box.width)
    })

    expect(ar.slice()).toEqual([40])
    box.height = 10
    expect(ar.slice()).toEqual([40, 20])
    box.sizes.push(3, 4)
    expect(ar.slice()).toEqual([40, 20, 60])
    box.someFunc = () => 7
    expect(ar.slice()).toEqual([40, 20, 60, 210])
    box.uninitialized = true
    expect(ar.slice()).toEqual([40, 20, 60, 210, 420])
    box.addSize()
    expect(ar.slice()).toEqual([40, 20, 60, 210, 420, 700])
    box.undeclared = 2
    expect(ar.slice()).toEqual([40, 20, 60, 210, 420, 700, 1400])
})

test("decorate should work with Object.create", function() {
    const Box = {
        uninitialized: undefined,
        height: 20,
        sizes: [2],
        someFunc: function() {
            return 2
        },
        get width() {
            return (
                this.undeclared *
                this.height *
                this.sizes.length *
                this.someFunc() *
                (this.uninitialized ? 2 : 1)
            )
        },
        addSize() {
            // @ts-ignore
            this.sizes.push([3])
            // @ts-ignore
            this.sizes.push([4])
        }
    }

    decorate(Box, {
        uninitialized: observable,
        undeclared: observable,
        height: observable,
        sizes: observable,
        someFunc: observable,
        width: computed,
        addSize: action
    })

    const box = Object.create(Box)
    box.undeclared = 1

    expect(isObservableObject(box)).toBe(true)
    expect(box.uninitialized).toBe(undefined)
    expect(box.height).toBe(20)
    expect(isObservableProp(box, "uninitialized")).toBe(true)
    expect(isObservableProp(box, "height")).toBe(true)
    expect(isObservableProp(box, "sizes")).toBe(true)
    expect(isObservable(box.sizes)).toBe(true)
    expect(isObservableProp(box, "someFunc")).toBe(true)
    expect(isComputedProp(box, "width")).toBe(true)
    expect(isAction(box.addSize)).toBe(true)

    var ar = []

    autorun(() => {
        ar.push(box.width)
    })

    expect(ar.slice()).toEqual([40])
    box.height = 10
    expect(ar.slice()).toEqual([40, 20])
    box.sizes.push(3, 4)
    expect(ar.slice()).toEqual([40, 20, 60])
    box.someFunc = () => 7
    expect(ar.slice()).toEqual([40, 20, 60, 210])
    box.uninitialized = true
    expect(ar.slice()).toEqual([40, 20, 60, 210, 420])
    box.addSize()
    expect(ar.slice()).toEqual([40, 20, 60, 210, 420, 700])
    box.undeclared = 2
    expect(ar.slice()).toEqual([40, 20, 60, 210, 420, 700, 1400])

    const box2 = Object.create(Box)
    box2.undeclared = 1
    expect(box2.width).toBe(40) // no shared state!
})

test("decorate should work with constructor function", function() {
    function Box() {
        this.uninitialized = undefined
        this.height = 20
        Object.defineProperty(this, "width", {
            configurable: true,
            enumerable: false,
            get() {
                /** @type {Box} */
                var t /** @type {any} */ = this

                return (
                    // @ts-ignore
                    t.undeclared *
                    t.height *
                    t.sizes.length *
                    t.someFunc() *
                    (t.uninitialized ? 2 : 1)
                )
            }
        })
        this.sizes = [2]
        this.someFunc = function() {
            return 2
        }
        this.addSize = function() {
            this.sizes.push([3])
            this.sizes.push([4])
        }
        decorate(this, {
            uninitialized: observable,
            undeclared: observable,
            height: observable,
            sizes: observable,
            someFunc: observable,
            width: computed,
            addSize: action
        })
    }

    const box = new Box()
    // @ts-ignore
    box.undeclared = 1

    expect(isObservableObject(box)).toBe(true)
    expect(box.uninitialized).toBe(undefined)
    expect(box.height).toBe(20)
    expect(isObservableProp(box, "uninitialized")).toBe(true)
    expect(isObservableProp(box, "height")).toBe(true)
    expect(isObservableProp(box, "sizes")).toBe(true)
    expect(isObservable(box.sizes)).toBe(true)
    expect(isObservableProp(box, "someFunc")).toBe(true)
    expect(isComputedProp(box, "width")).toBe(true)
    expect(isAction(box.addSize)).toBe(true)

    var ar = []

    autorun(() => {
        // @ts-ignore
        ar.push(box.width)
    })

    expect(ar.slice()).toEqual([40])
    box.height = 10
    expect(ar.slice()).toEqual([40, 20])
    box.sizes.push(3, 4)
    expect(ar.slice()).toEqual([40, 20, 60])
    box.someFunc = () => 7
    expect(ar.slice()).toEqual([40, 20, 60, 210])
    box.uninitialized = true
    expect(ar.slice()).toEqual([40, 20, 60, 210, 420])
    box.addSize()
    expect(ar.slice()).toEqual([40, 20, 60, 210, 420, 700])
    // @ts-ignore
    box.undeclared = 2
    expect(ar.slice()).toEqual([40, 20, 60, 210, 420, 700, 1400])

    const box2 = new Box()
    // @ts-ignore
    box2.undeclared = 1
    // @ts-ignore
    expect(box2.width).toBe(40) // no shared state!
})

test("decorate should work with inheritance through Object.create", () => {
    const P = {
        x: 3
    }
    decorate(P, {
        x: observable
    })

    const child1 = Object.create(P)
    expect(child1.x).toBe(3) // now an own property
    child1.x = 4
    expect(child1.x).toBe(4)
    const child2 = Object.create(P)
    expect(child2.x).toBe(3)
    child2.x = 5
    expect(child2.x).toBe(5)
    expect(child1.x).toBe(4)
})

test("decorate should work with ES6 constructor", () => {
    class Todo {
        constructor() {
            this.finished = false
            this.id = Math.random()
            this.title = ""
        }
    }

    decorate(Todo, {
        finished: observable,
        title: observable
    })
})

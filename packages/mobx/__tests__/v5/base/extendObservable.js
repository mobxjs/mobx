// @ts-check

import {
    action,
    autorun,
    isObservable,
    isObservableProp,
    isComputedProp,
    isAction,
    extendObservable,
    observable,
    reaction
} from "../../../src/mobx"

test("extendObservable should work", function () {
    class Box {
        // @ts-ignore
        uninitialized
        height = 20
        sizes = [2]
        someFunc = function () {
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

    const box = new Box()

    extendObservable(box, {
        height: 20,
        sizes: [2],
        get someFunc() {
            return 2
        },
        width: 40
    })

    expect(isObservableProp(box, "height")).toBe(true)
    expect(isObservableProp(box, "sizes")).toBe(true)
    expect(isObservable(box.sizes)).toBe(true)
    expect(isObservableProp(box, "someFunc")).toBe(true)
    expect(isComputedProp(box, "someFunc")).toBe(true)
    expect(isObservableProp(box, "width")).toBe(true)

    const ar = []

    autorun(() => {
        ar.push(box.width)
    })

    expect(ar.slice()).toEqual([40])
})

test("extendObservable should work with plain object", function () {
    const box = {
        /** @type {boolean | undefined} */
        uninitialized: undefined,
        height: 20,
        sizes: [2],
        someFunc: function () {
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

    box.undeclared = 1

    extendObservable(box, {
        height: 20,
        sizes: [2],
        get someFunc() {
            return 2
        },
        width: 40
    })

    expect(isObservableProp(box, "height")).toBe(true)
    expect(isObservableProp(box, "sizes")).toBe(true)
    expect(isObservable(box.sizes)).toBe(true)
    expect(isObservableProp(box, "someFunc")).toBe(true)
    expect(isComputedProp(box, "someFunc")).toBe(true)
    expect(isObservableProp(box, "width")).toBe(true)

    const ar = []

    autorun(() => {
        ar.push(box.width)
    })

    expect(ar.slice()).toEqual([40])
})

test("extendObservable should apply specified decorators", function () {
    const box = {
        /** @type {boolean | undefined} */
        uninitialized: undefined,
        height: 20,
        sizes: [2],
        someFunc: function () {
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

    box.undeclared = 1
    extendObservable(
        box,
        {
            someFunc: function () {
                return 2
            }
        },
        // @ts-ignore
        { someFunc: action }
    )

    expect(isAction(box.someFunc)).toBe(true)
    expect(box.someFunc()).toEqual(2)
})

test("extendObservable notifies about added keys", () => {
    let reactionCalled = false
    const o = observable({})
    const disposeReaction = reaction(
        () => Object.keys(o),
        () => (reactionCalled = true)
    )
    extendObservable(o, { x: 0 })
    expect(reactionCalled).toBe(true)
    disposeReaction()
})

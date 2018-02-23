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
    useStrict,
    decorate
} from "../../src/mobx"

test("decorate should work", function() {
    class Box {
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
            this.sizes.push([3])
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
})

const mobx = require("../../src/mobx.ts")
const startTrack = mobx.startTrack
const utils = require("../utils/test-utils")

test("basic", () => {
    let a = mobx.observable.box(1)
    let values = []

    const endTrack = startTrack(() => values.push(1))
    a.get()
    endTrack()

    expect(values).toEqual([])
    a.set(2)
    expect(values).toEqual([1])
})

test("only reaction for one time", () => {
    let a = mobx.observable.box(1)
    let values = []

    const endTrack = startTrack(() => values.push(1))
    a.get()
    endTrack()

    a.set(2)
    expect(values).toEqual([1])
    a.set(3)
    expect(values).toEqual([1])
})

test("nested track", () => {
    let a = mobx.observable.box(1)
    let b = mobx.observable.box(1)
    let values = []

    const endTrackA = startTrack(() => values.push(0))
    a.get()
    const endTrackB = startTrack(() => values.push(1))
    b.get()
    endTrackB()
    endTrackA()

    b.set(2)
    // trackA can't track the content of trackB
    expect(values).toEqual([1])

    a.set(2)
    b.get()
    // but trackA can track the content out of trackB
    expect(values).toEqual([1, 0])
})

test("only track until the first endTrack", () => {
    let a = mobx.observable.box(1)
    let b = mobx.observable.box(1)
    let values = []

    const endTrack = startTrack(() => values.push(1))
    a.get()
    endTrack()
    b.get() // untrack
    endTrack()

    b.set(2)
    expect(values).toEqual([])

    a.set(2)
    expect(values).toEqual([1])
})

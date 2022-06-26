import "./utils/killFinalizationRegistry"
import { act, cleanup, render } from "@testing-library/react"
import * as mobx from "mobx"
import * as React from "react"

import { useObserver } from "../src/useObserver"
import {
    forceCleanupTimerToRunNowForTests,
    resetCleanupScheduleForTests
} from "../src/utils/reactionCleanupTracking"
import {
    CLEANUP_LEAKED_REACTIONS_AFTER_MILLIS,
    CLEANUP_TIMER_LOOP_MILLIS
} from "../src/utils/reactionCleanupTrackingCommon"

afterEach(cleanup)

test("uncommitted components should not leak observations", async () => {
    resetCleanupScheduleForTests()

    // Unfortunately, Jest fake timers don't mock out Date.now, so we fake
    // that out in parallel to Jest useFakeTimers
    let fakeNow = Date.now()
    jest.useFakeTimers()
    jest.spyOn(Date, "now").mockImplementation(() => fakeNow)

    const store = mobx.observable({ count1: 0, count2: 0 })

    // Track whether counts are observed
    let count1IsObserved = false
    let count2IsObserved = false
    mobx.onBecomeObserved(store, "count1", () => (count1IsObserved = true))
    mobx.onBecomeUnobserved(store, "count1", () => (count1IsObserved = false))
    mobx.onBecomeObserved(store, "count2", () => (count2IsObserved = true))
    mobx.onBecomeUnobserved(store, "count2", () => (count2IsObserved = false))

    const TestComponent1 = () => useObserver(() => <div>{store.count1}</div>)
    const TestComponent2 = () => useObserver(() => <div>{store.count2}</div>)

    // Render, then remove only #2
    const rendering = render(
        <React.StrictMode>
            <TestComponent1 />
            <TestComponent2 />
        </React.StrictMode>
    )
    rendering.rerender(
        <React.StrictMode>
            <TestComponent1 />
        </React.StrictMode>
    )

    // Allow any reaction-disposal cleanup timers to run
    const skip = Math.max(CLEANUP_LEAKED_REACTIONS_AFTER_MILLIS, CLEANUP_TIMER_LOOP_MILLIS)
    fakeNow += skip
    jest.advanceTimersByTime(skip)

    // count1 should still be being observed by Component1,
    // but count2 should have had its reaction cleaned up.
    expect(count1IsObserved).toBeTruthy()
    expect(count2IsObserved).toBeFalsy()
})

test("cleanup timer should not clean up recently-pended reactions", () => {
    // If we're not careful with timings, it's possible to get the
    // following scenario:
    // 1. Component instance A is being created; it renders, we put its reaction R1 into the cleanup list
    // 2. Strict/Concurrent mode causes that render to be thrown away
    // 3. Component instance A is being created; it renders, we put its reaction R2 into the cleanup list
    // 4. The MobX reaction timer from 5 seconds ago kicks in and cleans up all reactions from uncommitted
    //    components, including R1 and R2
    // 5. The commit phase runs for component A, but reaction R2 has already been disposed. Game over.

    // This unit test attempts to replicate that scenario:
    resetCleanupScheduleForTests()

    // Unfortunately, Jest fake timers don't mock out Date.now, so we fake
    // that out in parallel to Jest useFakeTimers
    const fakeNow = Date.now()
    jest.useFakeTimers()
    jest.spyOn(Date, "now").mockImplementation(() => fakeNow)

    const store = mobx.observable({ count: 0 })

    // Track whether the count is observed
    let countIsObserved = false
    mobx.onBecomeObserved(store, "count", () => (countIsObserved = true))
    mobx.onBecomeUnobserved(store, "count", () => (countIsObserved = false))

    const TestComponent1 = () => useObserver(() => <div>{store.count}</div>)

    const rendering = render(
        // We use StrictMode here, but it would be helpful to switch this to use real
        // concurrent mode: we don't have a true async render right now so this test
        // isn't as thorough as it could be.
        <React.StrictMode>
            <TestComponent1 />
        </React.StrictMode>
    )

    // We need to trigger our cleanup timer to run. We can't do this simply
    // by running all jest's faked timers as that would allow the scheduled
    // `useEffect` calls to run, and we want to simulate our cleanup timer
    // getting in between those stages.

    // We force our cleanup loop to run even though enough time hasn't _really_
    // elapsed.  In theory, it won't do anything because not enough time has
    // elapsed since the reactions were queued, and so they won't be disposed.
    forceCleanupTimerToRunNowForTests()

    // Advance time enough to allow any timer-queued effects to run
    jest.advanceTimersByTime(500)

    // Now allow the useEffect calls to run to completion.
    act(() => {
        // no-op, but triggers effect flushing
    })

    // count should still be observed
    expect(countIsObserved).toBeTruthy()
})

// TODO: MWE: disabled during React 18 migration, not sure how to express it icmw with testing-lib,
// and using new React renderRoot will fail icmw JSDOM
test.skip("component should recreate reaction if necessary", () => {
    // There _may_ be very strange cases where the reaction gets tidied up
    // but is actually still needed.  This _really_ shouldn't happen.
    // e.g. if we're using Suspense and the component starts to render,
    // but then gets paused for 60 seconds, and then comes back to life.
    // With the implementation of React at the time of writing this, React
    // will actually fully re-render that component (discarding previous
    // hook slots) before going ahead with a commit, but it's unwise
    // to depend on such an implementation detail.  So we must cope with
    // the component having had its reaction tidied and still going on to
    // be committed.  In that case we recreate the reaction and force
    // an update.

    // This unit test attempts to replicate that scenario:

    resetCleanupScheduleForTests()

    // Unfortunately, Jest fake timers don't mock out Date.now, so we fake
    // that out in parallel to Jest useFakeTimers
    let fakeNow = Date.now()
    jest.useFakeTimers()
    jest.spyOn(Date, "now").mockImplementation(() => fakeNow)

    const store = mobx.observable({ count: 0 })

    // Track whether the count is observed
    let countIsObserved = false
    mobx.onBecomeObserved(store, "count", () => (countIsObserved = true))
    mobx.onBecomeUnobserved(store, "count", () => (countIsObserved = false))

    const TestComponent1 = () => useObserver(() => <div>{store.count}</div>)

    const rendering = render(
        <React.StrictMode>
            <TestComponent1 />
        </React.StrictMode>
    )

    // We need to trigger our cleanup timer to run. We don't want
    // to allow Jest's effects to run, however: we want to simulate the
    // case where the component is rendered, then the reaction gets cleaned up,
    // and _then_ the component commits.

    // Force everything to be disposed.
    const skip = Math.max(CLEANUP_LEAKED_REACTIONS_AFTER_MILLIS, CLEANUP_TIMER_LOOP_MILLIS)
    fakeNow += skip
    forceCleanupTimerToRunNowForTests()

    // The reaction should have been cleaned up.
    expect(countIsObserved).toBeFalsy()

    // Whilst nobody's looking, change the observable value
    store.count = 42

    // Now allow the useEffect calls to run to completion,
    // re-awakening the component.
    jest.advanceTimersByTime(500)
    act(() => {
        // no-op, but triggers effect flushing
    })

    // count should be observed once more.
    expect(countIsObserved).toBeTruthy()
    // and the component should have rendered enough to
    // show the latest value, which was set whilst it
    // wasn't even looking.
    expect(rendering.baseElement.textContent).toContain("42")
})

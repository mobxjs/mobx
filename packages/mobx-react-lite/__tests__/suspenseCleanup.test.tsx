import { act, cleanup, render } from "@testing-library/react"
import { computed, getObserverTree, observable, runInAction } from "mobx"
import * as React from "react"
import { clearTimers, observer } from "../src"
import {
    REGISTRY_FINALIZE_AFTER,
    REGISTRY_SWEEP_INTERVAL
} from "../src/utils/UniversalFinalizationRegistry"

const cleanupDelay = REGISTRY_FINALIZE_AFTER + REGISTRY_SWEEP_INTERVAL

function deferred() {
    let resolve!: () => void
    const promise = new Promise<void>(r => (resolve = r))
    return { promise, resolve }
}

beforeEach(() => {
    expect(typeof FinalizationRegistry).toBe("function")
    clearTimers()
    jest.useFakeTimers()
})

afterEach(() => {
    cleanup()
    clearTimers()
})

test.each([false, true])(
    "uncommitted suspended observers expire and survive repeated retries (StrictMode: %s)",
    async strict => {
        const source = observable.box(1)
        const gates = [deferred(), deferred()]
        let stage = 0
        let calculations = 0
        const View = observer(function View() {
            const [, setState] = React.useState(0)
            const derived = React.useMemo(
                () =>
                    computed(() => {
                        calculations++
                        // Retain the setter in the derivation, creating the path back to React.
                        return { value: source.get(), setState }
                    }),
                []
            )
            const value = derived.get().value
            if (stage < gates.length) {
                throw gates[stage].promise
            }
            return <span>{value}</span>
        })
        const tree = (
            <React.Suspense fallback="Loading">
                <View />
            </React.Suspense>
        )
        const rendering = render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree)

        for (const gate of gates) {
            expect(rendering.container.textContent).toBe("Loading")
            expect(getObserverTree(source).observers?.length).toBeGreaterThan(0)

            // Native finalization cannot be relied on while React/derivations retain the target.
            await Promise.resolve()
            act(() => jest.advanceTimersByTime(cleanupDelay))
            expect(getObserverTree(source).observers).toBeUndefined()
            const previousCalculations = calculations
            act(() => runInAction(() => source.set(source.get() + 1)))
            expect(calculations).toBe(previousCalculations)

            await act(async () => {
                stage++
                gate.resolve()
            })
        }

        expect(rendering.container.textContent).toBe("3")
        act(() => jest.advanceTimersByTime(cleanupDelay))
        act(() => runInAction(() => source.set(4)))
        expect(rendering.container.textContent).toBe("4")

        rendering.unmount()
        expect(getObserverTree(source).observers).toBeUndefined()
    }
)

test("an abandoned suspended tree releases its observations", async () => {
    const source = observable.box(1)
    const pending = new Promise<void>(() => {})
    const View = observer(() => {
        source.get()
        throw pending
    })
    const rendering = render(
        <React.Suspense fallback="Loading">
            <View />
        </React.Suspense>
    )
    expect(rendering.container.textContent).toBe("Loading")
    rendering.unmount()
    await Promise.resolve()
    act(() => jest.advanceTimersByTime(cleanupDelay))
    expect(getObserverTree(source).observers).toBeUndefined()
})

test.each([false, true])("cleanup before subscription recovers (state changed: %s)", changed => {
    const source = observable.box(1)
    const View = observer(() => <span>{source.get()}</span>)
    function Parent() {
        React.useLayoutEffect(() => {
            // Layout effects precede useSyncExternalStore's passive subscription.
            clearTimers()
            expect(getObserverTree(source).observers).toBeUndefined()
            if (changed) {
                runInAction(() => source.set(2))
            }
        }, [])
        return <View />
    }

    const rendering = render(<Parent />)
    expect(rendering.container.textContent).toBe(changed ? "2" : "1")
    expect(getObserverTree(source).observers).toHaveLength(1)
    act(() => jest.advanceTimersByTime(cleanupDelay))
    act(() => runInAction(() => source.set(3)))
    expect(rendering.container.textContent).toBe("3")
})

test("a suspended transition does not expire the committed observer", async () => {
    const source = observable.box(1)
    const gate = deferred()
    let ready = false
    let transition!: () => void
    const View = observer(({ suspend }: { suspend: boolean }) => {
        const value = source.get()
        if (suspend && !ready) {
            throw gate.promise
        }
        return <span>{value}</span>
    })
    function Parent() {
        const [suspend, setSuspend] = React.useState(false)
        transition = () => React.startTransition(() => setSuspend(true))
        return (
            <React.Suspense fallback="Loading">
                <View suspend={suspend} />
            </React.Suspense>
        )
    }

    const rendering = render(<Parent />)
    await act(async () => transition())
    expect(rendering.container.textContent).toBe("1")
    act(() => jest.advanceTimersByTime(cleanupDelay))
    expect(getObserverTree(source).observers).toHaveLength(1)
    act(() => runInAction(() => source.set(2)))
    expect(rendering.container.textContent).toBe("2")

    await act(async () => {
        ready = true
        gate.resolve()
    })
    expect(rendering.container.textContent).toBe("2")
    act(() => runInAction(() => source.set(3)))
    expect(rendering.container.textContent).toBe("3")
    rendering.unmount()
    expect(getObserverTree(source).observers).toBeUndefined()
})

import gc from "expose-gc/function"
import { setTimeout as realSetTimeout } from "timers"
import {
    FinalizationRegistryWithTimer,
    REGISTRY_FINALIZE_AFTER,
    REGISTRY_SWEEP_INTERVAL,
    TimerBasedFinalizationRegistry
} from "../src/utils/UniversalFinalizationRegistry"

function mockNativeRegistry() {
    let finalize!: (value: any) => void
    const native = {
        register: jest.fn(),
        unregister: jest.fn(),
        [Symbol.toStringTag]: "FinalizationRegistry" as const
    }
    jest.spyOn(globalThis, "FinalizationRegistry").mockImplementation(callback => {
        finalize = callback
        return native
    })
    return {
        native,
        collect() {
            finalize(native.register.mock.calls[0][1])
        }
    }
}

beforeEach(() => jest.useFakeTimers())

test("native finalization cancels timed cleanup", () => {
    const { native, collect } = mockNativeRegistry()
    const finalize = jest.fn()
    const registry = new FinalizationRegistryWithTimer(finalize)
    const target = {}
    registry.register(target, "value", target)

    expect(jest.getTimerCount()).toBe(1)
    collect()
    expect(finalize.mock.calls).toEqual([["value"]])
    expect(native.unregister).toHaveBeenCalledWith(native.register.mock.calls[0][2])
    expect(jest.getTimerCount()).toBe(0)
    jest.advanceTimersByTime(REGISTRY_FINALIZE_AFTER + REGISTRY_SWEEP_INTERVAL)
    expect(finalize).toHaveBeenCalledTimes(1)
})

test("timed cleanup cancels native finalization even while the target is retained", () => {
    const { native } = mockNativeRegistry()
    const finalize = jest.fn()
    const registry = new FinalizationRegistryWithTimer(finalize)
    const target = {}
    registry.register(target, { target }, target)

    jest.advanceTimersByTime(REGISTRY_FINALIZE_AFTER + REGISTRY_SWEEP_INTERVAL)
    expect(finalize.mock.calls).toEqual([[{ target }]])
    expect(native.unregister).toHaveBeenCalledWith(native.register.mock.calls[0][2])
    expect(jest.getTimerCount()).toBe(0)
    registry.finalizeAllImmediately()
    expect(finalize).toHaveBeenCalledTimes(1)
})

test("unregister cancels both cleanup paths and stops the last timer", () => {
    const { native } = mockNativeRegistry()
    const finalize = jest.fn()
    const registry = new FinalizationRegistryWithTimer(finalize)
    const token = {}
    registry.register({}, "value", token)
    registry.unregister(token)

    expect(native.unregister).toHaveBeenCalledWith(native.register.mock.calls[0][2])
    expect(jest.getTimerCount()).toBe(0)
    registry.finalizeAllImmediately()
    expect(finalize).not.toHaveBeenCalled()
})

test("immediate cleanup unregisters native entries and can be used unbound", () => {
    const { native } = mockNativeRegistry()
    const finalize = jest.fn()
    const registry = new FinalizationRegistryWithTimer(finalize)
    registry.register({}, "first", {})
    registry.register({}, "second", {})
    const clearTimers = registry.finalizeAllImmediately
    clearTimers()

    expect(finalize.mock.calls).toEqual([["first"], ["second"]])
    expect(native.unregister).toHaveBeenCalledTimes(2)
    expect(jest.getTimerCount()).toBe(0)
})

test("native cleanup can collect a target used as its own unregister token", async () => {
    const finalize = jest.fn()
    const registry = new FinalizationRegistryWithTimer(finalize)
    const targetRef = (() => {
        const target = {}
        registry.register(target, "value", target)
        return new WeakRef(target)
    })()

    // Leave the sweep clock frozen so only native finalization can pass this test.
    for (let attempt = 0; attempt < 100 && finalize.mock.calls.length === 0; attempt++) {
        await new Promise(resolve => realSetTimeout(resolve, 1))
        gc()
        await new Promise(resolve => realSetTimeout(resolve, 1))
    }
    expect(targetRef.deref()).toBeUndefined()
    expect(finalize.mock.calls).toEqual([["value"]])
    expect(jest.getTimerCount()).toBe(0)
})

describe.each([TimerBasedFinalizationRegistry, FinalizationRegistryWithTimer])("%p", Registry => {
    test("a sweep preserves recent registrations", () => {
        const finalize = jest.fn()
        const registry = new Registry(finalize)
        registry.register({}, "older", {})
        jest.advanceTimersByTime(REGISTRY_SWEEP_INTERVAL / 2)
        registry.register({}, "recent", {})
        jest.advanceTimersByTime(REGISTRY_SWEEP_INTERVAL / 2)
        expect(finalize.mock.calls).toEqual([["older"]])
        jest.advanceTimersByTime(REGISTRY_SWEEP_INTERVAL)
        expect(finalize.mock.calls).toEqual([["older"], ["recent"]])
        expect(jest.getTimerCount()).toBe(0)
    })

    test("disposal can re-register the same token without losing the new entry", () => {
        const token = {}
        const finalize = jest.fn(value => {
            if (value === "first") {
                registry.register({}, "second", token)
            }
        })
        const registry = new Registry(finalize)
        registry.register({}, "first", token)
        jest.advanceTimersByTime(REGISTRY_SWEEP_INTERVAL)
        expect(finalize.mock.calls).toEqual([["first"]])
        jest.advanceTimersByTime(REGISTRY_SWEEP_INTERVAL)
        expect(finalize.mock.calls).toEqual([["first"], ["second"]])
        expect(jest.getTimerCount()).toBe(0)
    })

    test("unregister stops an empty sweep and a later registration restarts it", () => {
        const finalize = jest.fn()
        const registry = new Registry(finalize)
        const token = {}
        registry.register({}, "cancelled", token)
        registry.unregister(token)
        expect(jest.getTimerCount()).toBe(0)
        registry.register({}, "new", token)
        expect(jest.getTimerCount()).toBe(1)
        jest.advanceTimersByTime(REGISTRY_FINALIZE_AFTER + REGISTRY_SWEEP_INTERVAL)
        expect(finalize.mock.calls).toEqual([["new"]])
        expect(jest.getTimerCount()).toBe(0)
    })
})

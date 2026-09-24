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

test("native finalization cancels timed cleanup", async () => {
    const { native, collect } = mockNativeRegistry()
    const finalize = jest.fn()
    const registry = new FinalizationRegistryWithTimer(finalize)
    const target = {}
    registry.register(target, "value", target)
    await Promise.resolve()

    expect(jest.getTimerCount()).toBe(1)
    collect()
    expect(finalize.mock.calls).toEqual([["value"]])
    expect(native.unregister).toHaveBeenCalledWith(native.register.mock.calls[0][2])
    expect(jest.getTimerCount()).toBe(0)
    jest.advanceTimersByTime(REGISTRY_FINALIZE_AFTER + REGISTRY_SWEEP_INTERVAL)
    expect(finalize).toHaveBeenCalledTimes(1)
})

test("timed cleanup cancels native finalization even while the target is retained", async () => {
    const { native } = mockNativeRegistry()
    const finalize = jest.fn()
    const registry = new FinalizationRegistryWithTimer(finalize)
    const target = {}
    registry.register(target, { target }, target)
    await Promise.resolve()

    jest.advanceTimersByTime(REGISTRY_FINALIZE_AFTER + REGISTRY_SWEEP_INTERVAL)
    expect(finalize.mock.calls).toEqual([[{ target }]])
    expect(native.unregister).toHaveBeenCalledWith(native.register.mock.calls[0][2])
    expect(jest.getTimerCount()).toBe(0)
    registry.finalizeAllImmediately()
    expect(finalize).toHaveBeenCalledTimes(1)
})

test("unregister cancels both cleanup paths and stops the last timer", async () => {
    const { native } = mockNativeRegistry()
    const finalize = jest.fn()
    const registry = new FinalizationRegistryWithTimer(finalize)
    const token = {}
    registry.register({}, "value", token)
    await Promise.resolve()
    registry.unregister(token)

    expect(native.unregister).toHaveBeenCalledWith(native.register.mock.calls[0][2])
    expect(jest.getTimerCount()).toBe(0)
    registry.finalizeAllImmediately()
    expect(finalize).not.toHaveBeenCalled()
})

test("synchronous subscriptions create no native registrations or timers", async () => {
    const { native } = mockNativeRegistry()
    const setTimeoutSpy = jest.spyOn(globalThis, "setTimeout")
    const finalize = jest.fn()
    const registry = new FinalizationRegistryWithTimer(finalize)
    for (let i = 0; i < 1_000; i++) {
        const target = {}
        registry.register(target, "value", target)
        registry.unregister(target)
    }
    await Promise.resolve()

    expect(native.register).not.toHaveBeenCalled()
    expect(native.unregister).not.toHaveBeenCalled()
    expect(setTimeoutSpy).not.toHaveBeenCalled()
    expect(finalize).not.toHaveBeenCalled()
})

test("pending renders share one timer and subscribing cancels it", async () => {
    const { native } = mockNativeRegistry()
    const setTimeoutSpy = jest.spyOn(globalThis, "setTimeout")
    const registry = new FinalizationRegistryWithTimer(jest.fn())
    const targets = Array.from({ length: 1_000 }, () => ({}))
    targets.forEach(target => registry.register(target, "value", target))
    expect(setTimeoutSpy).not.toHaveBeenCalled()
    await Promise.resolve()

    expect(native.register).toHaveBeenCalledTimes(1_000)
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1)
    expect(jest.getTimerCount()).toBe(1)
    targets.forEach(target => registry.unregister(target))
    expect(native.unregister).toHaveBeenCalledTimes(1_000)
    expect(jest.getTimerCount()).toBe(0)
})

test("a pending registration can be replaced before or after its microtask", async () => {
    const { native } = mockNativeRegistry()
    const finalize = jest.fn()
    const registry = new FinalizationRegistryWithTimer(finalize)
    const target = {}
    registry.register(target, "superseded before flush", target)
    registry.register(target, "superseded after flush", target)
    await Promise.resolve()
    expect(native.register).toHaveBeenCalledTimes(1)
    registry.register(target, "latest", target)
    await Promise.resolve()
    expect(native.register).toHaveBeenCalledTimes(2)
    jest.advanceTimersByTime(REGISTRY_FINALIZE_AFTER + REGISTRY_SWEEP_INTERVAL)
    expect(finalize.mock.calls).toEqual([["latest"]])
    expect(jest.getTimerCount()).toBe(0)
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
    test("a sweep preserves recent registrations", async () => {
        const finalize = jest.fn()
        const registry = new Registry(finalize)
        const olderTarget = {}
        const recentTarget = {}
        registry.register(olderTarget, "older", {})
        await Promise.resolve()
        jest.advanceTimersByTime(REGISTRY_SWEEP_INTERVAL / 2)
        registry.register(recentTarget, "recent", {})
        await Promise.resolve()
        jest.advanceTimersByTime(REGISTRY_SWEEP_INTERVAL / 2)
        expect(finalize.mock.calls).toEqual([["older"]])
        jest.advanceTimersByTime(REGISTRY_SWEEP_INTERVAL)
        expect(finalize.mock.calls).toEqual([["older"], ["recent"]])
        expect(jest.getTimerCount()).toBe(0)
    })

    test("disposal can re-register the same token without losing the new entry", async () => {
        const token = {}
        const finalize = jest.fn(value => {
            if (value === "first") {
                registry.register({}, "second", token)
            }
        })
        const registry = new Registry(finalize)
        registry.register({}, "first", token)
        await Promise.resolve()
        jest.advanceTimersByTime(REGISTRY_SWEEP_INTERVAL)
        expect(finalize.mock.calls).toEqual([["first"]])
        await Promise.resolve()
        jest.advanceTimersByTime(REGISTRY_SWEEP_INTERVAL)
        expect(finalize.mock.calls).toEqual([["first"], ["second"]])
        expect(jest.getTimerCount()).toBe(0)
    })

    test("unregister stops an empty sweep and a later registration restarts it", async () => {
        const finalize = jest.fn()
        const registry = new Registry(finalize)
        const token = {}
        registry.register({}, "cancelled", token)
        await Promise.resolve()
        registry.unregister(token)
        expect(jest.getTimerCount()).toBe(0)
        registry.register({}, "new", token)
        await Promise.resolve()
        expect(jest.getTimerCount()).toBe(1)
        jest.advanceTimersByTime(REGISTRY_FINALIZE_AFTER + REGISTRY_SWEEP_INTERVAL)
        expect(finalize.mock.calls).toEqual([["new"]])
        expect(jest.getTimerCount()).toBe(0)
    })
})

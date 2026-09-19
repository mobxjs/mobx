export declare class FinalizationRegistryType<T> {
    constructor(finalize: (value: T) => void)
    register(target: object, value: T, token?: object): void
    unregister(token: object): void
}

declare const FinalizationRegistry: typeof FinalizationRegistryType | undefined

export const REGISTRY_FINALIZE_AFTER = 10_000
export const REGISTRY_SWEEP_INTERVAL = 10_000

export class TimerBasedFinalizationRegistry<T> implements FinalizationRegistryType<T> {
    private registrations: Map<unknown, { value: T; registeredAt: number }> = new Map()
    private sweepTimeout: ReturnType<typeof setTimeout> | undefined

    constructor(private readonly finalize: (value: T) => void) {}

    // Token is actually required with this impl
    register(target: object, value: T, token?: object) {
        this.registrations.set(token, {
            value,
            registeredAt: Date.now()
        })
        this.scheduleSweep()
    }

    unregister(token: unknown) {
        this.registrations.delete(token)
        if (this.registrations.size === 0) {
            clearTimeout(this.sweepTimeout)
            this.sweepTimeout = undefined
        }
    }

    // Bound so it can be used directly as setTimeout callback.
    sweep = (maxAge = REGISTRY_FINALIZE_AFTER) => {
        // cancel timeout so we can force sweep anytime
        clearTimeout(this.sweepTimeout)
        this.sweepTimeout = undefined

        const now = Date.now()
        this.registrations.forEach((registration, token) => {
            if (now - registration.registeredAt >= maxAge) {
                this.registrations.delete(token)
                this.finalize(registration.value)
            }
        })

        if (this.registrations.size > 0) {
            this.scheduleSweep()
        }
    }

    // Bound so it can be exported directly as clearTimers test utility.
    finalizeAllImmediately = () => {
        this.sweep(0)
    }

    private scheduleSweep() {
        if (this.sweepTimeout === undefined) {
            this.sweepTimeout = setTimeout(this.sweep, REGISTRY_SWEEP_INTERVAL)
        }
    }
}

type Registration<T> = { value: T; token: object }

// Native finalization can run early, but cannot collect a target retained by its
// reaction's dependencies (for example, a computed capturing a React state setter).
// Keep the timer as a backstop even when native finalization is available.
export class FinalizationRegistryWithTimer<T> implements FinalizationRegistryType<T> {
    private finalizeRegistration = (registration: Registration<T>) => {
        // Remove both registrations before disposal, which can invoke user callbacks.
        this.native?.unregister(registration.token)
        this.timer.unregister(registration.token)
        this.finalize(registration.value)
    }

    private tokens = new WeakMap<object, object>()
    private native =
        typeof FinalizationRegistry !== "undefined"
            ? new FinalizationRegistry<Registration<T>>(this.finalizeRegistration)
            : undefined
    private timer = new TimerBasedFinalizationRegistry<Registration<T>>(this.finalizeRegistration)

    constructor(private readonly finalize: (value: T) => void) {}

    register(target: object, value: T, token: object = target) {
        this.unregister(token)
        // The unregister token can be the target itself (mobx-react classes).
        // Never retain it in the timer's Map, or native finalization cannot run.
        const registration = { value, token: {} }
        this.tokens.set(token, registration.token)
        this.native?.register(target, registration, registration.token)
        this.timer.register(target, registration, registration.token)
    }

    unregister(token: object) {
        const internalToken = this.tokens.get(token)
        if (internalToken) {
            this.tokens.delete(token)
            this.native?.unregister(internalToken)
            this.timer.unregister(internalToken)
        }
    }

    // Bound so it can be exported directly as clearTimers.
    finalizeAllImmediately = () => {
        this.timer.finalizeAllImmediately()
    }
}

export const UniversalFinalizationRegistry =
    typeof FinalizationRegistry !== "undefined"
        ? FinalizationRegistryWithTimer
        : TimerBasedFinalizationRegistry

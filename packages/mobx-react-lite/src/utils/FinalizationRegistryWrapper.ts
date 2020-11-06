declare class FinalizationRegistryType<T> {
    constructor(cleanup: (cleanupToken: T) => void)
    register(object: object, cleanupToken: T, unregisterToken?: object): void
    unregister(unregisterToken: object): void
}

declare const FinalizationRegistry: typeof FinalizationRegistryType | undefined

const FinalizationRegistryLocal =
    typeof FinalizationRegistry === "undefined" ? undefined : FinalizationRegistry

export { FinalizationRegistryLocal as FinalizationRegistry }

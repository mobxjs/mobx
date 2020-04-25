const errors = {
    0: `Invalid value for configuration 'enforceActions', expected 'never', 'always' or 'observed'`
} as const

export function die(error: string | keyof typeof errors, ...args: any[]): never {
    if (__DEV__) {
        const e = errors[error]
        const msg = !e
            ? "unknown error nr: " + error
            : typeof e === "function"
            ? e.apply(null, args as any)
            : e
        throw new Error(`[MobX] ${msg}`)
    }
    throw new Error(
        `[MobX] minified error nr: ${error}${
            args.length ? " " + args.join(",") : ""
        }. Find the full error at: https://github.com/mobxjs/mobx/blob/master/src/errors.ts`
    )
}

/**
 * Like die, but errors will be preserved in prod builds
 */
export function dieHard(error: string): never {
    throw new Error(`[MobX] ${error}`)
}

// TODO: remove this func
export function fail(message: string | boolean): never {
    invariant(false, message)
    throw "X" // unreachable
}

// TODO: kill, reuse the above
export const OBFUSCATED_ERROR =
    "An invariant failed, however the error is obfuscated because this is a production build."

// TODO: revisit this func
export function invariant(check: false, message?: string | boolean): never
export function invariant(check: true, message?: string | boolean): void
export function invariant(check: any, message?: string | boolean): void
export function invariant(check: boolean, message?: string | boolean) {
    if (!check) throw new Error("[mobx] " + (message || OBFUSCATED_ERROR))
}

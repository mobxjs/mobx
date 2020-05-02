import { isFunction } from "util"

const niceErrors = {
    0: `Invalid value for configuration 'enforceActions', expected 'never', 'always' or 'observed'`,
    1(prop) {
        return `Cannot decorate undefined property: '${prop.toString()}'`
    },
    2(prop) {
        return `invalid decorator for '${prop.toString()}'`
    },
    3(prop) {
        return `Cannot decorate '${prop.toString()}': action can only be used on properties with a function value.`
    },
    4(prop) {
        return `Cannot decorate '${prop.toString()}': computed can only be used on getter properties.`
    }
} as const

const errors: typeof niceErrors = __DEV__ ? niceErrors : ({} as any)

export function die(error: string | keyof typeof errors, ...args: any[]): never {
    if (__DEV__) {
        let e: any = typeof error === "string" ? error : errors[error]
        if (isFunction(e)) e = e.apply(null, args as any)
        throw new Error(`[MobX] ${e}`)
    }
    throw new Error(
        typeof error === "number"
            ? `[MobX] minified error nr: ${error}${
                  args.length ? " " + args.join(",") : ""
              }. Find the full error at: https://github.com/mobxjs/mobx/blob/master/src/errors.ts`
            : `[MobX] ${error}`
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
    if (!check) throw new Error("[MobX] " + (message || OBFUSCATED_ERROR))
}

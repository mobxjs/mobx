import { isFunction } from "./internal"

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
    },
    5: "'keys()' can only be used on observable objects, arrays, sets and maps",
    6: "'values()' can only be used on observable objects, arrays, sets and maps",
    7: "'entries()' can only be used on observable objects, arrays and maps",
    8: "'set()' can only be used on observable objects, arrays and maps",
    9: "'remove()' can only be used on observable objects, arrays and maps",
    10: "'has()' can only be used on observable objects, arrays and maps",
    11: "'get()' can only be used on observable objects, arrays and maps",
    12: `Invalid annotation`,
    13: `Dynamic observable objects cannot be frozen`,
    14: "Intercept handlers should return nothing or a change object"
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
    invariant(false, message as any)
    throw "X" // unreachable
}

export function invariant(check: any, message?: string | keyof typeof errors) {
    if (!check) die(message as any)
}

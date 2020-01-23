import { TraceMode, fail, getAtom, globalState } from "../internal"

export function trace(thing?: any, prop?: string, enterBreakPoint?: boolean): void
export function trace(thing?: any, enterBreakPoint?: boolean): void
export function trace(enterBreakPoint?: boolean): void
export function trace(...args: any[]): void {
    let enterBreakPoint = false
    if (typeof args[args.length - 1] === "boolean") enterBreakPoint = args.pop()
    const derivation = getAtomFromArgs(args)
    if (!derivation) {
        return fail(
            process.env.NODE_ENV !== "production" &&
                `'trace(break?)' can only be used inside a tracked computed value or a Reaction. Consider passing in the computed value or reaction explicitly`
        )
    }
    if (derivation.isTracing === TraceMode.NONE) {
        console.log(`[mobx.trace] '${derivation.name}' tracing enabled`)
    }
    derivation.isTracing = enterBreakPoint ? TraceMode.BREAK : TraceMode.LOG
}

function getAtomFromArgs(args): any {
    switch (args.length) {
        case 0:
            return globalState.trackingDerivation
        case 1:
            return getAtom(args[0])
        case 2:
            return getAtom(args[0], args[1])
    }
}

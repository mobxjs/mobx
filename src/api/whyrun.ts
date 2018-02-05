import { globalState } from "../core/globalstate"
import { isComputedValue } from "../core/computedvalue"
import { isReaction } from "../core/reaction"
import { getAtom } from "../types/type-utils"
import { fail } from "../utils/utils"
import { getMessage } from "../utils/messages"
import { TraceMode } from "../core/derivation"

function log(msg: string): string {
    console.log(msg)
    return msg
}

export function whyRun(thing?: any, prop?: string) {
    thing = getAtomFromArgs(arguments)
    if (!thing) return log(getMessage("m024"))
    if (isComputedValue(thing) || isReaction(thing)) return log(thing.whyRun())
    return fail(getMessage("m025"))
}

export function trace(thing?: any, prop?: string, enterBreakPoint?: boolean): void
export function trace(thing?: any, enterBreakPoint?: boolean): void
export function trace(enterBreakPoint?: boolean): void
export function trace(...args: any[]): void {
    let enterBreakPoint = false
    if (typeof args[args.length - 1] === "boolean") enterBreakPoint = args.pop()
    const derivation = getAtomFromArgs(args)
    if (!derivation) {
        return fail(
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

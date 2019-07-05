import {
    IDerivation,
    endBatch,
    fail,
    globalState,
    invariant,
    isSpyEnabled,
    spyReportEnd,
    spyReportStart,
    startBatch,
    untrackedEnd,
    untrackedStart
} from "../internal"

export interface IAction {
    isMobxAction: boolean
}

export function createAction(actionName: string, fn: Function, ref?: Object): Function & IAction {
    if (process.env.NODE_ENV !== "production") {
        invariant(typeof fn === "function", "`action` can only be invoked on functions")
        if (typeof actionName !== "string" || !actionName)
            fail(`actions should have valid names, got: '${actionName}'`)
    }
    const res = function() {
        return executeAction(actionName, fn, ref || this, arguments)
    }
    ;(res as any).isMobxAction = true
    return res as any
}

export function executeAction(actionName: string, fn: Function, scope?: any, args?: IArguments) {
    const runInfo = startAction(actionName, fn, scope, args)
    let shouldSupressReactionError = true
    try {
        const res = fn.apply(scope, args)
        shouldSupressReactionError = false
        return res
    } finally {
        if (shouldSupressReactionError) {
            globalState.suppressReactionErrors = shouldSupressReactionError
            endAction(runInfo)
            globalState.suppressReactionErrors = false
        } else {
            endAction(runInfo)
        }
    }
}

interface IActionRunInfo {
    prevDerivation: IDerivation | null
    prevAllowStateChanges: boolean
    notifySpy: boolean
    startTime: number
}

function startAction(
    actionName: string,
    fn: Function,
    scope: any,
    args?: IArguments
): IActionRunInfo {
    const notifySpy = isSpyEnabled() && !!actionName
    let startTime: number = 0
    if (notifySpy && process.env.NODE_ENV !== "production") {
        startTime = Date.now()
        const l = (args && args.length) || 0
        const flattendArgs = new Array(l)
        if (l > 0) for (let i = 0; i < l; i++) flattendArgs[i] = args![i]
        spyReportStart({
            type: "action",
            name: actionName,
            object: scope,
            arguments: flattendArgs
        })
    }
    const prevDerivation = untrackedStart()
    startBatch()
    const prevAllowStateChanges = allowStateChangesStart(true)
    return {
        prevDerivation,
        prevAllowStateChanges,
        notifySpy,
        startTime
    }
}

function endAction(runInfo: IActionRunInfo) {
    try {
        allowStateChangesEnd(runInfo.prevAllowStateChanges)
    } finally {
        endBatch()
        untrackedEnd(runInfo.prevDerivation)
        if (runInfo.notifySpy && process.env.NODE_ENV !== "production")
            spyReportEnd({ time: Date.now() - runInfo.startTime })
    }
}

export function allowStateChanges<T>(allowStateChanges: boolean, func: () => T): T {
    const prev = allowStateChangesStart(allowStateChanges)
    let res: T
    try {
        res = func()
    } finally {
        allowStateChangesEnd(prev)
    }
    return res
}

export function allowStateChangesStart(allowStateChanges: boolean) {
    const prev = globalState.allowStateChanges
    globalState.allowStateChanges = allowStateChanges
    return prev
}

export function allowStateChangesEnd(prev: boolean) {
    globalState.allowStateChanges = prev
}

export function allowStateChangesInsideComputed<T>(func: () => T): T {
    const prev = globalState.computationDepth
    globalState.computationDepth = 0
    let res: T
    try {
        res = func()
    } finally {
        globalState.computationDepth = prev
    }
    return res
}

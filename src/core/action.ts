import {
    invariant,
    fail,
    globalState,
    IDerivation,
    isSpyEnabled,
    spyReportStart,
    untrackedStart,
    startBatch,
    endBatch,
    untrackedEnd,
    spyReportEnd
} from "../internal"

export interface IAction {
    isMobxAction: boolean
}

export function createAction(actionName: string, fn: Function): Function & IAction {
    if (process.env.NODE_ENV !== "production") {
        invariant(typeof fn === "function", "`action` can only be invoked on functions")
        if (typeof actionName !== "string" || !actionName)
            fail(`actions should have valid names, got: '${actionName}'`)
    }
    const res = function() {
        return executeAction(actionName, fn, this, arguments)
    }
    ;(res as any).isMobxAction = true
    return res as any
}

export function startActionWithFinisher(
    actionName: string,
    scope?: any,
    args?: IArguments
): (threw: boolean) => void {
    const runInfo = startAction(actionName, scope, args)

    return (threw: boolean) => {
        runInfo.threw = threw
        endAction(runInfo)
    }
}

export function executeAction(actionName: string, fn: Function, scope?: any, args?: IArguments) {
    const runInfo = startAction(actionName, scope, args)
    runInfo.threw = true
    try {
        const res = fn.apply(scope, args)
        runInfo.threw = false
        return res
    } finally {
        endAction(runInfo)
    }
}

interface IActionRunInfo {
    prevDerivation: IDerivation | null
    prevAllowStateChanges: boolean
    notifySpy: boolean
    startTime: number
    threw?: boolean
}

function startAction(actionName: string, scope: any, args?: IArguments): IActionRunInfo {
    const notifySpy = isSpyEnabled() && !!actionName
    let startTime: number = 0
    if (notifySpy) {
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
    const runInfo = {
        prevDerivation,
        prevAllowStateChanges,
        notifySpy,
        startTime
    }
    if (process.env.NODE_ENV !== "production") {
        globalState.actionStack.push(runInfo)
    }
    return runInfo
}

function endAction(runInfo: IActionRunInfo) {
    if (process.env.NODE_ENV !== "production") {
        const actionStack = globalState.actionStack
        const expectedRunInfo = actionStack[actionStack.length - 1]
        if (expectedRunInfo !== runInfo) {
            fail("invalid action stack. did you forget to finish an action?")
        } else {
            actionStack.pop()
        }
    }

    if (runInfo.threw) {
        globalState.suppressReactionErrors = true
    }
    allowStateChangesEnd(runInfo.prevAllowStateChanges)
    endBatch()
    untrackedEnd(runInfo.prevDerivation)
    if (runInfo.notifySpy && process.env.NODE_ENV !== "production") {
        spyReportEnd({ time: Date.now() - runInfo.startTime })
    }
    globalState.suppressReactionErrors = false
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

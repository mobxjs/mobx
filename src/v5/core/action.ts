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
import { allowStateReadsStart, allowStateReadsEnd } from "./derivation"

// we don't use globalState for these in order to avoid possible issues with multiple
// mobx versions
let currentActionId = 0
let nextActionId = 1
const functionNameDescriptor = Object.getOwnPropertyDescriptor(() => {}, "name")
const isFunctionNameConfigurable = functionNameDescriptor && functionNameDescriptor.configurable

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
    if (process.env.NODE_ENV !== "production") {
        if (isFunctionNameConfigurable) {
            Object.defineProperty(res, "name", { value: actionName })
        }
    }
    return res as any
}

export function executeAction(actionName: string, fn: Function, scope?: any, args?: IArguments) {
    const runInfo = _startAction(actionName, scope, args)
    try {
        return fn.apply(scope, args)
    } catch (err) {
        runInfo.error = err
        throw err
    } finally {
        _endAction(runInfo)
    }
}

export interface IActionRunInfo {
    prevDerivation: IDerivation | null
    prevAllowStateChanges: boolean
    prevAllowStateReads: boolean
    notifySpy: boolean
    startTime: number
    error?: any
    parentActionId: number
    actionId: number
}

export function _startAction(actionName: string, scope: any, args?: IArguments): IActionRunInfo {
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
    const prevAllowStateReads = allowStateReadsStart(true)
    const runInfo = {
        prevDerivation,
        prevAllowStateChanges,
        prevAllowStateReads,
        notifySpy,
        startTime,
        actionId: nextActionId++,
        parentActionId: currentActionId
    }
    currentActionId = runInfo.actionId
    return runInfo
}

export function _endAction(runInfo: IActionRunInfo) {
    if (currentActionId !== runInfo.actionId) {
        fail("invalid action stack. did you forget to finish an action?")
    }
    currentActionId = runInfo.parentActionId

    if (runInfo.error !== undefined) {
        globalState.suppressReactionErrors = true
    }
    allowStateChangesEnd(runInfo.prevAllowStateChanges)
    allowStateReadsEnd(runInfo.prevAllowStateReads)
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

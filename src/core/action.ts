import {
    IDerivation,
    endBatch,
    globalState,
    isSpyEnabled,
    spyReportEnd,
    spyReportStart,
    startBatch,
    untrackedEnd,
    untrackedStart,
    isFunction,
    allowStateReadsStart,
    allowStateReadsEnd,
    ACTION,
    EMPTY_ARRAY
} from "../internal"
import { die } from "../errors"

// we don't use globalState for these in order to avoid possible issues with multiple
// mobx versions
let currentActionId = 0
let nextActionId = 1
const functionNameDescriptor = Object.getOwnPropertyDescriptor(() => {}, "name")
const isFunctionNameConfigurable = functionNameDescriptor?.configurable ?? false

export function createAction(actionName: string, fn: Function, ref?: Object): Function {
    if (__DEV__) {
        if (!isFunction(fn)) die("`action` can only be invoked on functions")
        if (typeof actionName !== "string" || !actionName)
            die(`actions should have valid names, got: '${actionName}'`)
    }
    function res() {
        return executeAction(actionName, fn, ref || this, arguments)
    }
    // TODO: can be optimized by recyclig objects? // TODO: and check if fn.name !== actionName
    return Object.defineProperties(res, {
        ...(isFunctionNameConfigurable && { name: { value: actionName } }),
        isMobxAction: { value: true }
    })
}

export function executeAction(actionName: string, fn: Function, scope?: any, args?: IArguments) {
    const runInfo = _startAction(actionName, scope, args)
    try {
        return fn.apply(scope, args)
    } catch (err) {
        runInfo.error_ = err
        throw err
    } finally {
        _endAction(runInfo)
    }
}

export interface IActionRunInfo {
    prevDerivation_: IDerivation | null
    prevAllowStateChanges_: boolean
    prevAllowStateReads_: boolean
    notifySpy_: boolean
    startTime_: number
    error_?: any
    parentActionId_: number
    actionId_: number
}

export function _startAction(actionName: string, scope: any, args?: IArguments): IActionRunInfo {
    const notifySpy_ = __DEV__ && isSpyEnabled() && !!actionName
    let startTime_: number = 0
    if (__DEV__ && notifySpy_) {
        startTime_ = Date.now()
        const flattendArgs = args ? Array.from(args) : EMPTY_ARRAY
        spyReportStart({
            type: ACTION,
            name: actionName,
            object: scope,
            arguments: flattendArgs
        })
    }
    const prevDerivation_ = untrackedStart()
    startBatch()
    const prevAllowStateChanges_ = allowStateChangesStart(true)
    const prevAllowStateReads_ = allowStateReadsStart(true)
    const runInfo = {
        prevDerivation_,
        prevAllowStateChanges_,
        prevAllowStateReads_,
        notifySpy_,
        startTime_,
        actionId_: nextActionId++,
        parentActionId_: currentActionId
    }
    currentActionId = runInfo.actionId_
    return runInfo
}

export function _endAction(runInfo: IActionRunInfo) {
    if (currentActionId !== runInfo.actionId_) {
        die(30)
    }
    currentActionId = runInfo.parentActionId_

    if (runInfo.error_ !== undefined) {
        globalState.suppressReactionErrors = true
    }
    allowStateChangesEnd(runInfo.prevAllowStateChanges_)
    allowStateReadsEnd(runInfo.prevAllowStateReads_)
    endBatch()
    untrackedEnd(runInfo.prevDerivation_)
    if (__DEV__ && runInfo.notifySpy_) {
        spyReportEnd({ time: Date.now() - runInfo.startTime_ })
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

import { IDerivation } from "./derivation"
import { invariant } from "../utils/utils"
import { untrackedStart, untrackedEnd } from "./derivation"
import { startBatch, endBatch } from "./observable"
import { MobxState } from "./mobxstate"
import { getMessage } from "../utils/messages"

export interface IAction {
	originalFn: Function
	isMobxAction: boolean
}

export function createAction(
	context: MobxState,
	actionName: string,
	fn: Function
): Function & IAction {
	invariant(typeof fn === "function", getMessage("m026"))
	invariant(
		typeof actionName === "string" && actionName.length > 0,
		`actions should have valid names, got: '${actionName}'`
	)
	const res = function(this: any) {
		return executeAction(context, actionName, fn, this, arguments)
	}
	;(res as any).originalFn = fn
	;(res as any).isMobxAction = true
	return res as any
}

export function runInAction<T>(context: MobxState, name: string, fn: () => T): T {
	invariant(typeof fn === "function", getMessage("m002"))
	invariant(fn.length === 0, getMessage("m003"))

	return executeAction(context, name, fn)
}

export function isAction(thing: any) {
	return typeof thing === "function" && thing.isMobxAction === true
}

export function executeAction(
	context: MobxState,
	actionName: string,
	fn: Function,
	thisArg?: any,
	args?: IArguments
) {
	const runInfo = startAction(context, actionName, fn, thisArg, args)
	try {
		return fn.apply(thisArg, args)
	} finally {
		endAction(context, runInfo)
	}
}

interface IActionRunInfo {
	prevDerivation: IDerivation | null
	prevAllowStateChanges: boolean
	notifySpy: boolean
	startTime: number
}

function startAction(
	context: MobxState,
	actionName: string,
	fn: Function,
	scope: any,
	args?: IArguments
): IActionRunInfo {
	const notifySpy = context.isSpyEnabled() && !!actionName
	let startTime: number = 0
	if (notifySpy) {
		startTime = Date.now()
		const l = (args && args.length) || 0
		const flattendArgs = new Array(l)
		if (l > 0) for (let i = 0; i < l; i++) flattendArgs[i] = args![i]
		context.spyReportStart({
			type: "action",
			name: actionName,
			fn,
			object: scope,
			arguments: flattendArgs
		})
	}
	const prevDerivation = untrackedStart(context)
	startBatch(context)
	const prevAllowStateChanges = allowStateChangesStart(context, true)
	return {
		prevDerivation,
		prevAllowStateChanges,
		notifySpy,
		startTime
	}
}

function endAction(context: MobxState, runInfo: IActionRunInfo) {
	allowStateChangesEnd(context, runInfo.prevAllowStateChanges)
	endBatch(context)
	untrackedEnd(context, runInfo.prevDerivation)
	if (runInfo.notifySpy) context.spyReportEnd({ time: Date.now() - runInfo.startTime })
}

export function allowStateChanges<T>(
	context: MobxState,
	allowStateChanges: boolean,
	func: () => T
): T {
	// TODO: deprecate / refactor this function in next major
	// Currently only used by `@observer`
	// Proposed change: remove first param, rename to `forbidStateChanges`,
	// require error callback instead of the hardcoded error message now used
	// Use `inAction` instead of allowStateChanges in derivation.ts to check strictMode
	const prev = allowStateChangesStart(context, allowStateChanges)
	let res
	try {
		res = func()
	} finally {
		allowStateChangesEnd(context, prev)
	}
	return res
}

export function allowStateChangesStart(context: MobxState, allowStateChanges: boolean) {
	const prev = context.allowStateChanges
	context.allowStateChanges = allowStateChanges
	return prev
}

export function allowStateChangesEnd(context: MobxState, prev: boolean) {
	context.allowStateChanges = prev
}

/**
 * This file imports and re-exports all relevant things from mobx-core, possibly with some re-binding to mobxstate
 */

import { mobxState } from "./globalstate"

export {
	IObservable,
	IReactionPublic,
	IReactionDisposer,
	IDerivation,
	IDepTreeNode,
	IAtom,
	IAction,
	IComputedValue,
	IEqualsComparer,
	IInterceptable,
	IInterceptor,
	IListenable,
	IValueDidChange,
	IValueWillChange,
	IObservableValue,
	IObserverTree,
	IDependencyTree,
	Lambda,
	isObservableValue as isBoxedObservable,
	isAction,
	getDependencyTree,
	getObserverTree
} from "../mobx-core"

import {
	noop,
	Atom,
	invariant,
	IAtom,
	untracked as mc_untracked,
	transaction as mc_transaction,
	autorun as mc_autorun,
	when as mc_when,
	reaction as mc_reaction,
	runInAction as mc_runInAction,
	allowStateChanges as mc_allowStateChanges,
	isComputingDerivation as mc_isComputingDerivation,
	onReactionError as mc_onReactionError,
	setReactionScheduler as mc_setReactionScheduler
} from "../mobx-core"

export const untracked = mc_untracked.bind(null, mobxState)
export const transaction = mc_transaction.bind(null, mobxState)
export const autorun = mc_autorun.bind(null, mobxState)
export const when = mc_when.bind(null, mobxState)
export const reaction = mc_reaction.bind(null, mobxState)
export const runInAction = mc_runInAction.bind(null, mobxState)
export const allowStateChanges = mc_allowStateChanges.bind(null, mobxState)
export const isComputingDerivation = mc_isComputingDerivation.bind(null, mobxState)
export const onReactionError = mc_onReactionError.bind(null, mobxState)
export const setReactionScheduler = mc_setReactionScheduler.bind(null, mobxState)

export function useStrict(strict: boolean): void {
	invariant(mobxState.trackingDerivation === null, getMessage("m028"))
	mobxState.strictMode = strict
	mobxState.allowStateChanges = !strict
}

export function createAtom(
	name?: string,
	onBecomeObservedHandler?: () => void,
	onBecomeUnobservedHandler?: () => void
): IAtom {
	return new Atom(
		mobxState,
		name || "Atom@" + mobxState.nextId(),
		onBecomeObservedHandler || noop,
		onBecomeUnobservedHandler || noop
	)
}

export const spy = mobxState.spy.bind(mobxState)

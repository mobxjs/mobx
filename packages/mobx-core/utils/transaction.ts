import { startBatch, endBatch } from '../core/observable';
import { executeAction } from "../core/action"
import { MobxState } from "../core/mobxstate";

/**
 * During a transaction no views are updated until the end of the transaction.
 * The transaction will be run synchronously nonetheless.
 *
 * @param action a function that updates some reactive state
 * @returns any value that was returned by the 'action' parameter.
 */
export function transaction<T>(context: MobxState, action: () => T): T {
	startBatch(context)
	try {
		return action()
	} finally {
		endBatch(context)
	}
}

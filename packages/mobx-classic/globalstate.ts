import { MobxState } from "../mobx-core/index"
import { getGlobal, deprecated } from "./utils/utils"

export let mobxState: MobxState = new MobxState()

let runInIsolationCalled = false
let warnedAboutMultipleInstances = false

{
	const global = getGlobal()
	if (!global.__mobxInstanceCount) {
		global.__mobxInstanceCount = 1
	} else {
		global.__mobxInstanceCount++
		setTimeout(() => {
			if (!runInIsolationCalled && !warnedAboutMultipleInstances) {
				warnedAboutMultipleInstances = true
				console.warn(
					"[mobx] Warning: there are multiple mobx instances active. This might lead to unexpected results. See https://github.com/mobxjs/mobx/issues/1082 for details."
				)
			}
		})
	}
}

export function isolateGlobalState() {
	runInIsolationCalled = true
	getGlobal().__mobxInstanceCount--
}

export function getGlobalState(): any {
	return mobxState
}

/**
 * For testing purposes only; this will break the internal state of existing observables,
 * but can be used to get back at a stable state after throwing errors
 */
export function resetGlobalState() {
	mobxState.reset()
}

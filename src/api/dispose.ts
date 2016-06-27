import {globalState} from "../core/globalstate";

export function dispose() {
	if (globalState.currentReaction) {
		globalState.currentReaction.dispose();
	} else {
		console.error('mobx: dispose() must be called inside reaction');
	}
}

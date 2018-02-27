import { globalState } from "../core/globalstate"

export function configure(options: { enforceActions?: boolean }): void {
    if (options.enforceActions !== undefined) {
        globalState.enforceActions = !!options.enforceActions
        globalState.allowStateChanges = !options.enforceActions
    }
}

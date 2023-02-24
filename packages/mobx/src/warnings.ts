import { globalState } from "./internal"

const warnings = {
    computedRequiresReaction: (name: string) =>
        `[mobx] Computed value '${name}' is being read outside a reactive context. Doing a full recompute.`,

    enforceActionsStrict: (name: string) =>
        `[MobX] Since strict-mode is enabled, changing (observed) observable values without using an action is not ` +
        `allowed. Tried to modify: ${name}`,

    enforceActionsNonStrict: (name: string) =>
        `[MobX] Side effects like changing state are not allowed at this point. Are you trying to modify state from, ` +
        `for example, a computed value or the render function of a React component? You can wrap side effects in ` +
        `'runInAction' (or decorate functions with 'action') if needed. Tried to modify: ${name}`,

    observableRequiresReaction: (name: string) =>
        `[mobx] Observable '${name}' being read outside a reactive context.`,

    derivationWithoutDependencies: (name: string) =>
        `[mobx] Derivation '${name}' is created/updated without reading any observable value.`
}
type Warnings = typeof warnings
export type WarningSeverity = { [k in keyof Warnings]?: "warn" | "throw" }

export function warn<K extends keyof Warnings>(warning: K, ...args: Parameters<Warnings[K]>) {
    const message = (warnings[warning] as (...args: any[]) => string).call(null, args)

    if (globalState.warningSeverity[warning] === "throw") {
        throw new Error(message)
    } else {
        console.warn(message)
    }
}

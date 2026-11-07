import type { NormalizedObserverOptions, NormalizedOptions } from "./options"

export const TS_FILE_RE = /\.[cm]?ts$/
const HOOK_CALL_RE = /\buse[A-Z0-9]/
const JSX_RE = /<\s*[A-Za-z_$>]/
const ASYNC_RE = /\basync\b/
const FLOW_TARGET_RE = /\bmake(?:Auto)?Observable\b|@\s*(?:flow|action)/

export interface NeededTransforms {
    observer: NormalizedObserverOptions | null
    flow: boolean
}

// Textual checks that let a file skip parsing and analysis. They may report a transform as
// needed for a file that does not change, never the other way round. An empty `code` (Babel
// was given an AST only) needs everything.
export function neededTransforms(
    code: string,
    filename: string | null | undefined,
    options: NormalizedOptions
): NeededTransforms {
    return {
        observer:
            options.observer !== null && (!code || mayNeedObserver(code, filename))
                ? options.observer
                : null,
        flow: options.flow && (!code || mayNeedFlow(code))
    }
}

function mayNeedObserver(code: string, filename: string | null | undefined): boolean {
    // `.ts` files have no JSX, so `Array<string>` and the like do not count.
    const jsx = !filename || !TS_FILE_RE.test(filename)
    return HOOK_CALL_RE.test(code) || (jsx && JSX_RE.test(code))
}

function mayNeedFlow(code: string): boolean {
    return ASYNC_RE.test(code) && FLOW_TARGET_RE.test(code)
}

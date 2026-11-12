import type { NormalizedObserverOptions, NormalizedOptions } from "./options"

export const TS_FILE_RE = /\.[cm]?ts$/
const HOOK_CALL_RE = /\buse[A-Z0-9]/
const JSX_RE = /<\s*[A-Za-z_$>]/
const ASYNC_RE = /\basync\b/
const FLOW_TARGET_RE = /\bmake(?:Auto)?Observable\b|@\s*(?:flow|action)/

interface NeededTransforms {
    observer: NormalizedObserverOptions | null
    flow: boolean
}

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
    const jsx = !filename || !TS_FILE_RE.test(filename)
    return HOOK_CALL_RE.test(code) || (jsx && JSX_RE.test(code))
}

function mayNeedFlow(code: string): boolean {
    return ASYNC_RE.test(code) && FLOW_TARGET_RE.test(code)
}

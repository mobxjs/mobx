import * as path from "path"
import picomatch from "picomatch"

/**
 * A file filter: a picomatch glob (matched against the absolute path and the
 * path relative to the Babel/Vite root), a RegExp, or a predicate receiving the
 * absolute filename.
 */
export type FilterPattern = string | RegExp | ((filename: string) => boolean)

export interface ObserverOptions {
    /**
     * Insert the `"use no memo"` directive into every component so that React Compiler
     * leaves memoization and invalidation of observed components to MobX.
     * The directive is inert when React Compiler is not used.
     * @default true
     */
    useNoMemo?: boolean
    /**
     * Also insert `"use no memo"` into custom hooks (`useXxx`). A hook compiled by React
     * Compiler would cache derived values against the stable identity of observable
     * objects, which goes stale. Set to `false` if your hooks never read observables.
     * @default true
     */
    useNoMemoHooks?: boolean
}

export interface Options {
    /**
     * Wrap React components in `observer` and mark components and hooks with
     * `"use no memo"` for React Compiler. Pass an object to configure it.
     * @default true
     */
    observer?: boolean | ObserverOptions
    /**
     * Turn `async` methods of observable classes and objects into generator methods,
     * i.e. MobX `flow`s: every step after an `await` runs inside an action.
     * @default true
     */
    flow?: boolean
    /**
     * Only transform files matching at least one of these patterns.
     * `node_modules` is always skipped.
     */
    include?: FilterPattern | FilterPattern[]
    /**
     * Never transform files matching one of these patterns.
     */
    exclude?: FilterPattern | FilterPattern[]
}

type Matcher = (absolute: string, relative: string | null) => boolean

export interface NormalizedObserverOptions {
    useNoMemo: boolean
    useNoMemoHooks: boolean
}

export interface NormalizedOptions {
    observer: NormalizedObserverOptions | null
    flow: boolean
    include: Matcher[] | null
    exclude: Matcher[]
}

const KNOWN_OPTIONS = new Set<keyof Options>(["observer", "flow", "include", "exclude"])
const KNOWN_OBSERVER_OPTIONS = new Set<keyof ObserverOptions>(["useNoMemo", "useNoMemoHooks"])

function assertKnownKeys(object: object, known: Set<string>, context: string): void {
    for (const key of Object.keys(object)) {
        if (!known.has(key)) {
            throw new Error(
                `[mobx-react-plugin] Unknown ${
                    context ? context + " " : ""
                }option "${key}". Known options: ${Array.from(known).join(", ")}.`
            )
        }
    }
}

function normalizeObserverOptions(
    raw: boolean | ObserverOptions | undefined
): NormalizedObserverOptions | null {
    if (raw === false) {
        return null
    }
    const options: ObserverOptions = raw === true || raw === undefined ? {} : raw
    assertKnownKeys(options, KNOWN_OBSERVER_OPTIONS as Set<string>, "observer")
    const useNoMemo = options.useNoMemo ?? true
    return {
        useNoMemo,
        useNoMemoHooks: useNoMemo && (options.useNoMemoHooks ?? true)
    }
}

export function normalizeOptions(raw: Options | null | undefined = {}): NormalizedOptions {
    const options: Options = raw ?? {}
    assertKnownKeys(options, KNOWN_OPTIONS as Set<string>, "")
    return {
        observer: normalizeObserverOptions(options.observer),
        flow: options.flow ?? true,
        include: options.include === undefined ? null : toMatchers(options.include),
        exclude: options.exclude === undefined ? [] : toMatchers(options.exclude)
    }
}

function toMatchers(patterns: FilterPattern | FilterPattern[]): Matcher[] {
    return (Array.isArray(patterns) ? patterns : [patterns]).map(toMatcher)
}

function toMatcher(pattern: FilterPattern): Matcher {
    if (typeof pattern === "function") {
        return absolute => pattern(absolute)
    }
    if (pattern instanceof RegExp) {
        return (absolute, relative) => {
            pattern.lastIndex = 0
            if (pattern.test(absolute)) {
                return true
            }
            pattern.lastIndex = 0
            return relative !== null && pattern.test(relative)
        }
    }
    if (typeof pattern !== "string") {
        throw new Error(
            `[mobx-react-plugin] Invalid include/exclude pattern: expected a glob string, RegExp or function, got ${typeof pattern}.`
        )
    }
    const isMatch = picomatch(pattern, { dot: true })
    return (absolute, relative) => isMatch(absolute) || (relative !== null && isMatch(relative))
}

function toPosix(filename: string): string {
    return filename.split(path.sep).join("/").replace(/\\/g, "/")
}

export function shouldProcessFile(
    filename: string | undefined | null,
    cwd: string | undefined | null,
    options: NormalizedOptions
): boolean {
    if (!filename) {
        return options.include === null
    }
    const absolute = toPosix(filename)
    if (/(^|\/)node_modules\//.test(absolute)) {
        return false
    }
    let relative: string | null = null
    if (cwd) {
        const rel = toPosix(path.relative(cwd, filename))
        if (rel && !rel.startsWith("../") && rel !== ".." && !path.isAbsolute(rel)) {
            relative = rel
        }
    }
    if (options.include !== null && !options.include.some(match => match(absolute, relative))) {
        return false
    }
    if (options.exclude.some(match => match(absolute, relative))) {
        return false
    }
    return true
}

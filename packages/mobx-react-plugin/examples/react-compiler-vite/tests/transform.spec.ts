import * as path from "node:path"
import { build, createServer } from "vite"
import type { Plugin } from "vite"
import { afterAll, beforeAll, describe, expect, test } from "vitest"

const configFile = path.resolve(process.cwd(), "vite.config.ts")
// Separate dependency cache so these in-process Vite instances never invalidate
// the cache of a `vite dev` server running for the same project.
const cacheDir = path.resolve(process.cwd(), "node_modules/.vite-tests")

// Every function compiled by React Compiler starts with `const $ = _c(n)`.
const MEMO_CACHE = /\b_c\(\d+\)/
const PROTECTED_COUNTER = "src/protected/AutoObservedCounter.tsx"
const PROTECTED_TODOS = "src/protected/AutoObservedTodos.tsx"
const CONTROL = "src/controls/UnsafeManualObserver.tsx"
const PURE = "src/pure/PureReactComponent.tsx"

function assertOutputs(outputs: Map<string, string>) {
    const get = (file: string) => {
        const entry = Array.from(outputs.entries()).find(([id]) => id.endsWith(file))
        if (!entry) {
            throw new Error(
                `No output captured for ${file}: ${Array.from(outputs.keys()).join(", ")}`
            )
        }
        return entry[1]
    }

    const counter = get(PROTECTED_COUNTER)
    expect(counter).toContain("observer(")
    expect(counter).toContain('"use no memo"')
    expect(counter).toContain("mobx-react-lite")
    expect(counter).not.toMatch(MEMO_CACHE)

    const todos = get(PROTECTED_TODOS)
    expect(todos).toContain("observer(")
    expect(todos).toContain('"use no memo"')
    expect(todos).not.toMatch(MEMO_CACHE)

    const control = get(CONTROL)
    expect(control).toContain("observer(CounterView)")
    expect(control).not.toContain('"use no memo"')
    expect(control).toMatch(MEMO_CACHE)

    const pure = get(PURE)
    expect(pure).not.toContain("observer(")
    expect(pure).toMatch(MEMO_CACHE)
}

describe("development server (vite dev)", () => {
    let server: Awaited<ReturnType<typeof createServer>>

    beforeAll(async () => {
        server = await createServer({
            configFile,
            cacheDir,
            logLevel: "silent",
            server: { middlewareMode: true },
            appType: "custom"
        })
    })

    afterAll(async () => {
        await server.close()
    })

    test("per-file transforms", async () => {
        const outputs = new Map<string, string>()
        for (const file of [PROTECTED_COUNTER, PROTECTED_TODOS, CONTROL, PURE]) {
            const result = await server.transformRequest("/" + file)
            outputs.set(file, result!.code)
        }
        assertOutputs(outputs)
    })
})

describe("production build (vite build)", () => {
    test("per-file transforms", async () => {
        const outputs = new Map<string, string>()
        const capture: Plugin = {
            name: "capture-transformed-modules",
            enforce: "post",
            transform(code, id) {
                if (id.includes("/src/")) {
                    outputs.set(id, code)
                }
                return null
            }
        }
        await build({
            configFile,
            cacheDir,
            logLevel: "silent",
            plugins: [capture],
            build: { write: false }
        })
        assertOutputs(outputs)
    })
})

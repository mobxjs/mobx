// Run: node --expose-gc packages/mobx-react-lite/benchmarks/finalizationRegistry.cjs
// Optional: --comparison /path/to/earlier/UniversalFinalizationRegistry.ts
// Or: --comparison-ref <git commit>
// --baseline-ref defaults to the commit before the fix for #4705.
// Measures actual Node timers/native finalization and production React in JSDOM.
// JSDOM timings do not include browser layout, paint, or application-specific work.
process.env.NODE_ENV = "production"

const assert = require("node:assert/strict")
const { execFileSync } = require("node:child_process")
const { createHash } = require("node:crypto")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { performance } = require("node:perf_hooks")
const ts = require("typescript")
const { JSDOM } = require("jsdom")
const mobx = require("mobx")

const directory = path.resolve(__dirname, "../src")
const registryPath = path.join(directory, "utils/UniversalFinalizationRegistry.ts")
const root = path.resolve(directory, "../../..")
const args = process.argv.slice(2)
const option = (name, fallback) => {
    const index = args.indexOf(name)
    return index === -1 ? fallback : args[index + 1]
}
const samples = Number(option("--samples", "15"))
const warmups = Number(option("--warmups", "3"))
const comparisonPath = option("--comparison")
const comparisonRef = option("--comparison-ref")
const baselineRef = option("--baseline-ref", "01211a69")
const outputPath = option("--output")
const sourceAtRef = ref =>
    execFileSync(
        "git",
        ["show", `${ref}:packages/mobx-react-lite/src/utils/UniversalFinalizationRegistry.ts`],
        {
            cwd: root,
            encoding: "utf8"
        }
    )
assert.ok(!(comparisonPath && comparisonRef), "Choose a comparison file or a git ref")
const variants = [
    {
        name: "original",
        source: sourceAtRef(baselineRef)
    },
    ...(comparisonPath ? [{ name: "eager", source: fs.readFileSync(comparisonPath, "utf8") }] : []),
    ...(comparisonRef ? [{ name: "eager", source: sourceAtRef(comparisonRef) }] : []),
    { name: "current", source: fs.readFileSync(registryPath, "utf8") }
]

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" })
global.window = dom.window
global.document = dom.window.document
global.HTMLElement = dom.window.HTMLElement
const React = require("react")
const { createRoot } = require("react-dom/client")
const { flushSync } = require("react-dom")
mobx.configure({ enforceActions: "never" })

function compile(source, filename) {
    return ts.transpileModule(source, {
        fileName: filename,
        compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.CommonJS,
            esModuleInterop: true,
            useDefineForClassFields: true
        }
    }).outputText
}

function loadRegistry(source) {
    const exports = {}
    new Function("exports", compile(source, registryPath))(exports)
    return exports
}

function loadBindings(registryExports) {
    const cache = new Map([[registryPath, registryExports]])
    function load(filename) {
        if (cache.has(filename)) {
            return cache.get(filename)
        }
        const module = { exports: {} }
        cache.set(filename, module.exports)
        const localRequire = id => {
            if (!id.startsWith(".")) {
                return require(id)
            }
            let resolved = path.resolve(path.dirname(filename), id)
            resolved = fs.existsSync(resolved + ".ts")
                ? resolved + ".ts"
                : path.join(resolved, "index.ts")
            return load(resolved)
        }
        new Function(
            "require",
            "module",
            "exports",
            "__DEV__",
            compile(fs.readFileSync(filename, "utf8"), filename)
        )(localRequire, module, module.exports, false)
        return module.exports
    }
    return load(path.join(directory, "index.ts"))
}

for (const variant of variants) {
    variant.registry = loadRegistry(variant.source)
    variant.bindings = loadBindings(variant.registry)
}

// Instrumentation is used in a separate untimed pass, so it cannot skew CPU comparisons.
async function countTimers(work) {
    const set = global.setTimeout
    const clear = global.clearTimeout
    const active = new Set()
    const counters = { created: 0, peakActive: 0, remaining: 0 }
    global.setTimeout = (callback, delay, ...args) => {
        const timer = set(() => {
            active.delete(timer)
            callback(...args)
        }, delay)
        active.add(timer)
        counters.created++
        counters.peakActive = Math.max(counters.peakActive, active.size)
        return timer
    }
    global.clearTimeout = timer => {
        active.delete(timer)
        return clear(timer)
    }
    try {
        await work()
        counters.remaining = active.size
        assert.equal(counters.remaining, 0)
        return counters
    } finally {
        active.forEach(clear)
        global.setTimeout = set
        global.clearTimeout = clear
    }
}

function registryWorkload(variant, batchSize, deferCommit = false) {
    const registry = new variant.registry.UniversalFinalizationRegistry(() => {
        throw new Error("Committed registrations must not be finalized")
    })
    const count = 100_000
    const targets = Array.from({ length: count }, () => ({}))
    const value = {}
    return async () => {
        for (let start = 0; start < count; start += batchSize) {
            for (let i = start; i < start + batchSize; i++) {
                registry.register(targets[i], value, targets[i])
            }
            if (deferCommit) {
                await Promise.resolve()
            }
            for (let i = start; i < start + batchSize; i++) {
                registry.unregister(targets[i])
            }
        }
        await Promise.resolve()
    }
}

function reactWorkload(variant, rows = 1_000, cycles = 10) {
    const source = mobx.observable.box(1)
    const Row = variant.bindings.observer(() => React.createElement("span", null, source.get()))
    const tree = React.createElement(
        React.Fragment,
        null,
        Array.from({ length: rows }, (_, key) => React.createElement(Row, { key }))
    )
    const container = document.createElement("div")
    const root = createRoot(container)
    return {
        run: async () => {
            for (let i = 0; i < cycles; i++) {
                flushSync(() => root.render(tree))
                assert.equal(container.childNodes.length, rows)
                await Promise.resolve()
                flushSync(() => root.render(null))
            }
            await Promise.resolve()
            assert.equal(mobx.getObserverTree(source).observers, undefined)
        },
        cleanup: () => root.unmount()
    }
}

function summarize(values) {
    const sorted = values.toSorted((a, b) => a - b)
    return {
        median: sorted[Math.floor(sorted.length / 2)],
        p10: sorted[Math.floor(sorted.length * 0.1)],
        p90: sorted[Math.floor(sorted.length * 0.9)]
    }
}

async function measureWorkload(name, factory) {
    const jobs = variants.map(variant => {
        const work = factory(variant)
        return {
            variant,
            work: typeof work === "function" ? { run: work } : work,
            wall: [],
            cpu: []
        }
    })
    for (let round = -warmups; round < samples; round++) {
        // Rotate execution order to reduce systematic warmup/thermal bias.
        for (let offset = 0; offset < jobs.length; offset++) {
            const job = jobs[(round + warmups + offset) % jobs.length]
            global.gc()
            // Let finalization callbacks and background GC from the previous
            // sample settle before starting the CPU clock.
            await new Promise(resolve => setTimeout(resolve, 20))
            const cpu = process.cpuUsage()
            const start = performance.now()
            await job.work.run()
            const wall = performance.now() - start
            const used = process.cpuUsage(cpu)
            if (round >= 0) {
                job.wall.push(wall)
                job.cpu.push((used.user + used.system) / 1_000)
            }
        }
    }
    const results = []
    for (const job of jobs) {
        const timers = await countTimers(job.work.run)
        job.work.cleanup?.()
        results.push({
            variant: job.variant.name,
            wallMs: summarize(job.wall),
            cpuMs: summarize(job.cpu),
            timers
        })
    }
    return { name, results }
}

async function measureDisposal(variant, count) {
    const registry = new variant.registry.UniversalFinalizationRegistry(adm =>
        adm.reaction.dispose()
    )
    const source = mobx.observable.box(1)
    const targets = []
    for (let i = 0; i < count; i++) {
        const target = {}
        targets.push(target)
        const derived = mobx.computed(() => source.get() + i)
        const reaction = new mobx.Reaction("abandoned", () => {})
        reaction.track(() => derived.get())
        registry.register(target, { reaction }, target)
    }
    await Promise.resolve()
    assert.equal(mobx.getObserverTree(source).observers.length, count)
    global.gc()
    await new Promise(resolve => setTimeout(resolve, 20))
    const cpu = process.cpuUsage()
    const start = performance.now()
    registry.finalizeAllImmediately()
    const wall = performance.now() - start
    const used = process.cpuUsage(cpu)
    assert.equal(mobx.getObserverTree(source).observers, undefined)
    assert.equal(targets.length, count)
    return { wall, cpu: (used.user + used.system) / 1_000 }
}

async function main() {
    assert.equal(typeof global.gc, "function", "Run Node with --expose-gc")
    const report = {
        environment: {
            node: process.version,
            react: React.version,
            jsdom: require("jsdom/package.json").version,
            cpu: os.cpus()[0].model,
            platform: process.platform,
            arch: process.arch
        },
        samples,
        warmups,
        baselineRef,
        comparisonRef,
        sourceHashes: Object.fromEntries(
            variants.map(v => [v.name, createHash("sha256").update(v.source).digest("hex")])
        ),
        workloads: []
    }
    for (const [name, factory] of [
        ["100k register/commit pairs", variant => registryWorkload(variant, 1)],
        [
            "100k registrations committed in batches of 1000",
            variant => registryWorkload(variant, 1_000)
        ],
        [
            "100k pending registrations committed after a microtask",
            variant => registryWorkload(variant, 100_000, true)
        ],
        [
            "React: 1000 separate observer mount/unmount cycles",
            variant => reactWorkload(variant, 1, 1_000)
        ],
        ["React: ten mount/unmount cycles of 1000 observers", reactWorkload]
    ]) {
        const result = await measureWorkload(name, factory)
        report.workloads.push(result)
        console.log(JSON.stringify(result))
    }
    for (const count of [1_000, 10_000]) {
        const results = []
        for (const variant of variants.filter(v => v.name !== "original")) {
            const values = []
            for (let i = -warmups; i < samples; i++) {
                const result = await measureDisposal(variant, count)
                if (i >= 0) values.push(result)
            }
            results.push({
                variant: variant.name,
                wallMs: summarize(values.map(v => v.wall)),
                cpuMs: summarize(values.map(v => v.cpu))
            })
        }
        const result = { name: `Dispose ${count} abandoned reactions and computeds`, results }
        report.workloads.push(result)
        console.log(JSON.stringify(result))
    }
    if (outputPath) fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n")
    console.log(JSON.stringify(report.environment))
    dom.window.close()
}

main().catch(error => {
    console.error(error)
    process.exitCode = 1
})

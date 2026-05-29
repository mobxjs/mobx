// Exploration benchmark for #4639 follow-up: how much would a lazy
// `@observable accessor` save?
//
// Mirrors lazy-computed-decorator.ts but for `@observable accessor` fields.
// Today the decorator's `init` callback eagerly constructs an `ObservableValue`
// during instance construction. To estimate the upper bound on savings from
// deferring that to first read, we compare:
//
//   - WIDE: 10 `@observable` fields, 1 read per instance (sparse access)
//   - NARROW: 1 `@observable` field, 1 read per instance (the field actually used)
//
// The WIDE→NARROW delta approximates what a lazy variant could save if it only
// allocated `ObservableValue`s for fields actually touched.

/* eslint-disable @typescript-eslint/no-require-imports */
import * as path from "path"
const distPath = path.resolve(__dirname, "..", "..", "..", "dist", "mobx.cjs.development.js")
const mobx = require(distPath) as {
    makeObservable: any
    observable: any
}
const { makeObservable, observable } = mobx

const INSTANCES = 50_000
const RUNS = 3
const RE_READS = 5

class Wide {
    @observable accessor f0 = 0
    @observable accessor f1 = 1
    @observable accessor f2 = 2
    @observable accessor f3 = 3
    @observable accessor f4 = 4
    @observable accessor f5 = 5
    @observable accessor f6 = 6
    @observable accessor f7 = 7
    @observable accessor f8 = 8
    @observable accessor f9 = 9
    constructor() {
        makeObservable(this)
    }
}

class Narrow {
    @observable accessor f0 = 0
    constructor() {
        makeObservable(this)
    }
}

const FIELDS_WIDE = ["f0", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9"] as const
const FIELDS_NARROW = ["f0"] as const

function forceGc() {
    if (typeof global.gc === "function") global.gc()
}

function heapMB(): number {
    return process.memoryUsage().heapUsed / (1024 * 1024)
}

type Sample = {
    constructHeapMB: number
    constructMs: number
    firstReadMs: number
    reReadMs: number
}

function bench<T>(Ctor: new () => T, fields: readonly string[]): Sample {
    forceGc()
    const heapBefore = heapMB()

    const t0 = performance.now()
    const instances: T[] = new Array(INSTANCES)
    for (let i = 0; i < INSTANCES; i++) instances[i] = new Ctor()
    const t1 = performance.now()

    forceGc()
    const heapAfter = heapMB()

    const t2 = performance.now()
    let sink = 0
    for (let i = 0; i < INSTANCES; i++) {
        sink += (instances[i] as any)[fields[i % fields.length]]
    }
    const t3 = performance.now()

    const t4 = performance.now()
    for (let r = 0; r < RE_READS; r++) {
        for (let i = 0; i < INSTANCES; i++) {
            sink += (instances[i] as any)[fields[i % fields.length]]
        }
    }
    const t5 = performance.now()

    if (sink === Number.NEGATIVE_INFINITY) console.log("unreachable")

    return {
        constructHeapMB: heapAfter - heapBefore,
        constructMs: t1 - t0,
        firstReadMs: t3 - t2,
        reReadMs: t5 - t4
    }
}

function fmt(n: number, digits = 1): string {
    return n.toFixed(digits).padStart(8)
}

function runScenario(label: string, Ctor: new () => any, fields: readonly string[]) {
    bench(Ctor, fields) // warmup
    const samples: Sample[] = []
    for (let r = 0; r < RUNS; r++) samples.push(bench(Ctor, fields))

    console.log(`\n${label}`)
    console.log("run | construct heap MB | construct ms | first-read ms | re-read ms")
    console.log("----+-------------------+--------------+---------------+-----------")
    samples.forEach((s, i) => {
        console.log(
            `  ${i + 1} | ${fmt(s.constructHeapMB)}          | ${fmt(s.constructMs)}     | ${fmt(
                s.firstReadMs
            )}      | ${fmt(s.reReadMs)}`
        )
    })
    const avg = (pick: (s: Sample) => number) =>
        samples.reduce((a, s) => a + pick(s), 0) / samples.length
    console.log(
        `avg | ${fmt(avg(s => s.constructHeapMB))}          | ${fmt(
            avg(s => s.constructMs)
        )}     | ${fmt(avg(s => s.firstReadMs))}      | ${fmt(avg(s => s.reReadMs))}`
    )
    return {
        constructHeapMB: avg(s => s.constructHeapMB),
        constructMs: avg(s => s.constructMs),
        firstReadMs: avg(s => s.firstReadMs),
        reReadMs: avg(s => s.reReadMs)
    }
}

function benchAllFields(Ctor: new () => any, fields: readonly string[]): Sample {
    forceGc()
    const heapBefore = heapMB()

    const t0 = performance.now()
    const instances: any[] = new Array(INSTANCES)
    for (let i = 0; i < INSTANCES; i++) instances[i] = new Ctor()
    const t1 = performance.now()

    forceGc()
    const heapAfter = heapMB()

    const t2 = performance.now()
    let sink = 0
    for (let i = 0; i < INSTANCES; i++) {
        for (let f = 0; f < fields.length; f++) sink += instances[i][fields[f]]
    }
    const t3 = performance.now()

    const t4 = performance.now()
    for (let r = 0; r < RE_READS; r++) {
        for (let i = 0; i < INSTANCES; i++) {
            for (let f = 0; f < fields.length; f++) sink += instances[i][fields[f]]
        }
    }
    const t5 = performance.now()

    if (sink === Number.NEGATIVE_INFINITY) console.log("unreachable")

    return {
        constructHeapMB: heapAfter - heapBefore,
        constructMs: t1 - t0,
        firstReadMs: t3 - t2,
        reReadMs: t5 - t4
    }
}

function runFullScenario(label: string, Ctor: new () => any, fields: readonly string[]) {
    benchAllFields(Ctor, fields) // warmup
    const samples: Sample[] = []
    for (let r = 0; r < RUNS; r++) samples.push(benchAllFields(Ctor, fields))
    console.log(`\n${label}`)
    console.log("run | construct heap MB | construct ms | first-read ms | re-read ms")
    console.log("----+-------------------+--------------+---------------+-----------")
    samples.forEach((s, i) => {
        console.log(
            `  ${i + 1} | ${fmt(s.constructHeapMB)}          | ${fmt(s.constructMs)}     | ${fmt(
                s.firstReadMs
            )}      | ${fmt(s.reReadMs)}`
        )
    })
    const avg = (pick: (s: Sample) => number) =>
        samples.reduce((a, s) => a + pick(s), 0) / samples.length
    console.log(
        `avg | ${fmt(avg(s => s.constructHeapMB))}          | ${fmt(
            avg(s => s.constructMs)
        )}     | ${fmt(avg(s => s.firstReadMs))}      | ${fmt(avg(s => s.reReadMs))}`
    )
    return {
        constructHeapMB: avg(s => s.constructHeapMB),
        constructMs: avg(s => s.constructMs),
        firstReadMs: avg(s => s.firstReadMs),
        reReadMs: avg(s => s.reReadMs)
    }
}

function main() {
    console.log(`\nLazy @observable benchmark — ${INSTANCES} instances, ${RE_READS} re-reads.`)
    console.log(`Node ${process.version}, ${RUNS} timed runs after 1 warmup per scenario.`)

    console.log(`\n=== SPARSE: 1 of 10 fields read per instance (best case for lazy) ===`)
    const sparseWide = runScenario(`WIDE: 10 @observable fields`, Wide, FIELDS_WIDE)
    runScenario(`NARROW: 1 @observable field`, Narrow, FIELDS_NARROW)

    console.log(`\n=== FULL: ALL 10 fields read per instance (worst case for lazy) ===`)
    const fullWide = runFullScenario(`WIDE-FULL: 10 fields, all read`, Wide, FIELDS_WIDE)

    console.log(`\nWIDE: sparse vs full read pattern (same class, same lazy/eager state):`)
    console.log(
        `  construct heap : ${sparseWide.constructHeapMB.toFixed(
            1
        )} MB → unchanged (heap measured before reads)`
    )
    console.log(`  construct time : ${sparseWide.constructMs.toFixed(1)} ms → unchanged`)
    console.log(`  first-read 1×  : ${sparseWide.firstReadMs.toFixed(1)} ms`)
    console.log(`  first-read 10× : ${fullWide.firstReadMs.toFixed(1)} ms`)
}

main()

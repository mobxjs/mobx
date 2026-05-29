// Benchmark for the lazy `@observable accessor` decorator (#4616 follow-up
// to #4639).
//
// Shape: many instances of a wide class with 10 `@observable accessor` fields,
// measured under two read patterns:
//
//   - SPARSE: 1 of 10 fields read per instance (the realistic #4616 shape)
//   - FULL:   all 10 fields read per instance (steady-state worst case for
//             lazy — every deferred allocation eventually happens)
//
// For each pattern we report construction heap, construction time, first-read
// time (the pass that materialises the `ObservableValue`s), and re-read time
// (steady state). Run with `npm run perf-decorator` (requires a prior
// `npm run build`).
//
// This file only measures the *currently built* mobx — it cannot compare
// against an eager baseline on its own. To get eager numbers, check out a
// commit before this PR, run `npm run build` + `npm run perf-decorator`, and
// compare.

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

const FIELDS = ["f0", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9"] as const

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

// readsPerInstance = 1  → SPARSE (each instance reads fields[i % fields.length])
// readsPerInstance = 10 → FULL   (each instance reads every field)
function bench(readsPerInstance: number): Sample {
    forceGc()
    const heapBefore = heapMB()

    const t0 = performance.now()
    const instances: Wide[] = new Array(INSTANCES)
    for (let i = 0; i < INSTANCES; i++) instances[i] = new Wide()
    const t1 = performance.now()

    forceGc()
    const heapAfter = heapMB()

    const t2 = performance.now()
    let sink = 0
    for (let i = 0; i < INSTANCES; i++) {
        const inst = instances[i] as any
        if (readsPerInstance === 1) {
            sink += inst[FIELDS[i % FIELDS.length]]
        } else {
            for (let f = 0; f < readsPerInstance; f++) sink += inst[FIELDS[f]]
        }
    }
    const t3 = performance.now()

    const t4 = performance.now()
    for (let r = 0; r < RE_READS; r++) {
        for (let i = 0; i < INSTANCES; i++) {
            const inst = instances[i] as any
            if (readsPerInstance === 1) {
                sink += inst[FIELDS[i % FIELDS.length]]
            } else {
                for (let f = 0; f < readsPerInstance; f++) sink += inst[FIELDS[f]]
            }
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

function runScenario(label: string, readsPerInstance: number) {
    bench(readsPerInstance) // warmup
    const samples: Sample[] = []
    for (let r = 0; r < RUNS; r++) samples.push(bench(readsPerInstance))

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
}

function main() {
    console.log(`\nLazy @observable benchmark — ${INSTANCES} instances, ${RE_READS} re-reads.`)
    console.log(`Node ${process.version}, ${RUNS} timed runs after 1 warmup per scenario.`)

    console.log(`\n=== SPARSE: 1 of 10 fields read per instance (best case for lazy) ===`)
    runScenario(`WIDE: 10 @observable fields, 1 field read per instance`, 1)

    console.log(`\n=== FULL: ALL 10 fields read per instance (steady-state worst case) ===`)
    runScenario(`WIDE: 10 @observable fields, 10 fields read per instance`, 10)
}

main()

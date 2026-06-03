// Benchmark for the lazy `@observable accessor` decorator (#4616 follow-up
// to #4639).
//
// Shape: many instances of wide stage-3-decorator classes with 10
// `@observable accessor` fields, measured under sparse, full, and
// constructor-hydration patterns. This file intentionally does not call
// `makeObservable`; it measures only the 2022.3 decorator path affected by this
// PR.
//
// Run with `npm run perf-decorator` (requires a prior `npm run build`).

/* eslint-disable @typescript-eslint/no-require-imports */
import * as path from "path"
const distPath = path.resolve(__dirname, "..", "..", "..", "dist", "mobx.cjs.development.js")
const mobx = require(distPath) as {
    observable: any
}
const { observable } = mobx

const INSTANCES = 50_000
const RUNS = 3
const RE_READS = 5

const FIELDS = ["f0", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9"] as const
const READ_THREE = ["f0", "f1", "f2"] as const

type Field = (typeof FIELDS)[number]
type WideCtor = new (seed: number) => any

class DefaultsWide {
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
}

class AssignedPartialWide {
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

    constructor(seed: number) {
        this.f0 = seed
        this.f1 = seed + 1
        this.f2 = seed + 2
    }
}

class AssignedAllWide {
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

    constructor(seed: number) {
        this.f0 = seed
        this.f1 = seed + 1
        this.f2 = seed + 2
        this.f3 = seed + 3
        this.f4 = seed + 4
        this.f5 = seed + 5
        this.f6 = seed + 6
        this.f7 = seed + 7
        this.f8 = seed + 8
        this.f9 = seed + 9
    }
}

type Sample = {
    constructHeapMB: number
    constructMs: number
    firstReadMs: number
    reReadMs: number
    writeMs?: number
}

function forceGc() {
    if (typeof global.gc === "function") global.gc()
}

function heapMB(): number {
    return process.memoryUsage().heapUsed / (1024 * 1024)
}

function readSparse(instances: any[]): number {
    let sink = 0
    for (let i = 0; i < INSTANCES; i++) sink += instances[i][FIELDS[i % FIELDS.length]]
    return sink
}

function readFields(instances: any[], fields: readonly Field[]): number {
    let sink = 0
    for (let i = 0; i < INSTANCES; i++) {
        const inst = instances[i]
        for (let f = 0; f < fields.length; f++) sink += inst[fields[f]]
    }
    return sink
}

function writeField(instances: any[], field: Field): number {
    let sink = 0
    for (let i = 0; i < INSTANCES; i++) {
        instances[i][field] = i
        sink += instances[i][field]
    }
    return sink
}

function bench(Ctor: WideCtor, read: (instances: any[]) => number, writeFieldName?: Field): Sample {
    forceGc()
    const heapBefore = heapMB()

    const t0 = performance.now()
    const instances: any[] = new Array(INSTANCES)
    for (let i = 0; i < INSTANCES; i++) instances[i] = new Ctor(i)
    const t1 = performance.now()

    forceGc()
    const heapAfter = heapMB()

    const t2 = performance.now()
    let sink = read(instances)
    const t3 = performance.now()

    const t4 = performance.now()
    for (let r = 0; r < RE_READS; r++) sink += read(instances)
    const t5 = performance.now()

    let writeMs: number | undefined
    if (writeFieldName) {
        const t6 = performance.now()
        sink += writeField(instances, writeFieldName)
        const t7 = performance.now()
        writeMs = t7 - t6
    }

    if (sink === Number.NEGATIVE_INFINITY) console.log("unreachable")

    return {
        constructHeapMB: heapAfter - heapBefore,
        constructMs: t1 - t0,
        firstReadMs: t3 - t2,
        reReadMs: t5 - t4,
        writeMs
    }
}

function fmt(n: number | undefined, digits = 1): string {
    return n === undefined ? "        " : n.toFixed(digits).padStart(8)
}

function runScenario(
    label: string,
    Ctor: WideCtor,
    read: (instances: any[]) => number,
    writeFieldName?: Field
) {
    bench(Ctor, read, writeFieldName) // warmup
    const samples: Sample[] = []
    for (let r = 0; r < RUNS; r++) samples.push(bench(Ctor, read, writeFieldName))

    console.log(`\n${label}`)
    console.log("run | construct heap MB | construct ms | first-read ms | re-read ms | write ms")
    console.log("----+-------------------+--------------+---------------+------------+---------")
    samples.forEach((s, i) => {
        console.log(
            `  ${i + 1} | ${fmt(s.constructHeapMB)}          | ${fmt(s.constructMs)}     | ${fmt(
                s.firstReadMs
            )}      | ${fmt(s.reReadMs)}     | ${fmt(s.writeMs)}`
        )
    })
    const avg = (pick: (s: Sample) => number | undefined) => {
        const values = samples.map(pick).filter((value): value is number => value !== undefined)
        return values.length ? values.reduce((a, v) => a + v, 0) / values.length : undefined
    }
    console.log(
        `avg | ${fmt(avg(s => s.constructHeapMB))}          | ${fmt(
            avg(s => s.constructMs)
        )}     | ${fmt(avg(s => s.firstReadMs))}      | ${fmt(
            avg(s => s.reReadMs)
        )}     | ${fmt(avg(s => s.writeMs))}`
    )
}

function main() {
    console.log(`\nLazy @observable benchmark — ${INSTANCES} instances, ${RE_READS} re-reads.`)
    console.log(`Node ${process.version}, ${RUNS} timed runs after 1 warmup per scenario.`)
    console.log(`Stage-3 decorators only; no makeObservable/makeAutoObservable.`)

    runScenario("DEFAULTS: sparse 1 of 10 fields read", DefaultsWide, readSparse)
    runScenario(
        "DEFAULTS: 3 of 10 fields read, then write unread f9",
        DefaultsWide,
        instances => readFields(instances, READ_THREE),
        "f9"
    )
    runScenario(
        "HYDRATED PARTIAL: constructor assigns 3 of 10, read those 3, then write unread f9",
        AssignedPartialWide,
        instances => readFields(instances, READ_THREE),
        "f9"
    )
    runScenario(
        "HYDRATED FULL: constructor assigns all 10, read 3, then write f9",
        AssignedAllWide,
        instances => readFields(instances, READ_THREE),
        "f9"
    )
    runScenario(
        "HYDRATED FULL: constructor assigns all 10, read all 10, then write f9",
        AssignedAllWide,
        instances => readFields(instances, FIELDS),
        "f9"
    )
}

main()

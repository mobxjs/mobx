// Benchmark for the lazy `@computed` decorator (#4616 / #4639).
//
// Shape: many instances of a class with several `@computed` getters where only
// one getter is read per instance — the realistic "wide class, sparse access"
// pattern. Compares construction heap, construction time, first-read time, and
// re-read time. Run with `yarn perf-decorator` (requires a prior `yarn build`).

/* eslint-disable @typescript-eslint/no-require-imports */
import * as path from "path"
const distPath = path.resolve(__dirname, "..", "..", "..", "dist", "mobx.cjs.development.js")
const mobx = require(distPath) as {
    computed: any
    makeObservable: any
    observable: any
}
const { computed, makeObservable, observable } = mobx

const INSTANCES = 50_000
const GETTERS_PER_INSTANCE = 10
const RUNS = 3
const RE_READS = 5

class Wide {
    @observable accessor v = 1

    @computed get c0() {
        return this.v + 0
    }
    @computed get c1() {
        return this.v + 1
    }
    @computed get c2() {
        return this.v + 2
    }
    @computed get c3() {
        return this.v + 3
    }
    @computed get c4() {
        return this.v + 4
    }
    @computed get c5() {
        return this.v + 5
    }
    @computed get c6() {
        return this.v + 6
    }
    @computed get c7() {
        return this.v + 7
    }
    @computed get c8() {
        return this.v + 8
    }
    @computed get c9() {
        return this.v + 9
    }

    constructor() {
        makeObservable(this)
    }
}

const GETTERS = ["c0", "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9"] as const
if (GETTERS.length !== GETTERS_PER_INSTANCE) throw new Error("getter list mismatch")

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

function bench(): Sample {
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
        sink += (instances[i] as any)[GETTERS[i % GETTERS_PER_INSTANCE]]
    }
    const t3 = performance.now()

    const t4 = performance.now()
    for (let r = 0; r < RE_READS; r++) {
        for (let i = 0; i < INSTANCES; i++) {
            sink += (instances[i] as any)[GETTERS[i % GETTERS_PER_INSTANCE]]
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

function main() {
    console.log(
        `\nLazy @computed decorator benchmark — ${INSTANCES} instances × ` +
            `${GETTERS_PER_INSTANCE} @computed getters, 1 read/instance, ${RE_READS} re-reads.`
    )
    console.log(`Node ${process.version}, ${RUNS} timed runs after 1 warmup.\n`)

    bench() // warmup

    const samples: Sample[] = []
    for (let r = 0; r < RUNS; r++) samples.push(bench())

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

main()

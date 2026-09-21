# Finalization registry performance

Run the benchmark from the repository root:

```sh
node --expose-gc packages/mobx-react-lite/benchmarks/finalizationRegistry.cjs \
  --baseline-ref 01211a69 \
  --comparison-ref df99fc6f \
  --samples 15 --warmups 3 \
  --output /tmp/mobx-finalization-results.json
```

The baseline is the original native-only registry. The comparison is the first
patch, which immediately registers with both native finalization and the timer
registry. The current working-tree implementation stages registrations until a
shared microtask. Synchronous subscriptions remove their staged entries before
any native registration or timer is needed.

The benchmark uses real native finalization and Node timers. It transpiles the
registry and React bindings from source and runs production React against JSDOM.
Timer instrumentation runs separately from timing measurements. Registration
benchmarks preallocate targets; React benchmarks include actual rendering and
subscription work. Cleanup benchmarks construct MobX reaction/computed pairs,
then force expiry through the same sweep/disposal code used by the timer. Setup
is excluded from cleanup measurements, and observation release is asserted.

Each workload has three warmup runs and 15 measured runs. Variant order rotates
for registration and React workloads. GC runs outside the measured region, with
a 20 ms settling interval before each measurement. CPU time is total process CPU,
including runtime threads; elapsed time measures how long the operation takes.
The JSON output includes medians, p10/p90, environment information and source hashes.

## Local results

Measured on Apple M1, macOS arm64, Node 24.13.0, React 19.0.0, JSDOM 26.1.0.
Native `FinalizationRegistry` is enabled throughout. Values below are median
**elapsed milliseconds / CPU milliseconds** per complete workload.

| Workload                                            |        Original |     First patch |    Staged patch |
| --------------------------------------------------- | --------------: | --------------: | --------------: |
| 100,000 immediate register/commit pairs             |   15.59 / 22.82 |   59.12 / 80.27 |    9.25 / 16.39 |
| 100,000 registrations committed in batches of 1,000 |   19.02 / 19.01 |   42.67 / 50.54 |   10.87 / 10.88 |
| 100,000 registrations committed after a microtask   |   23.63 / 37.14 |   64.91 / 77.79 |   75.49 / 90.20 |
| React: 1,000 separate observer mount/unmount cycles |   26.08 / 47.79 |   28.29 / 54.30 |   26.17 / 49.86 |
| React: ten mount/unmount cycles of 1,000 observers  | 556.10 / 640.84 | 564.88 / 646.88 | 558.68 / 646.71 |
| Dispose 1,000 reaction/computed pairs               |             N/A |     0.44 / 0.45 |     0.45 / 0.47 |
| Dispose 10,000 reaction/computed pairs              |             N/A |     4.33 / 4.53 |     4.65 / 5.14 |

The original registry has no timed cleanup operation, so it is omitted from
disposal measurements.

For 100,000 immediate register/commit pairs, the first patch creates and cancels
100,000 timers. The staged patch creates zero timers and performs no native
registrations. For 100,000 registrations that remain pending across the
microtask, both patches create one timer. Every workload ends with zero active
timers. The peak concurrent timer count is at most one per registry.

The isolated synchronous registration overhead improves substantially with
staging. The React timing distributions overlap: for 1,000 separate mounts,
the original elapsed p10/p90 is 24.53–26.78 ms and the staged patch is
25.38–26.89 ms. This harness does not establish a meaningful overall application
speedup or regression.

Staging has a measurable cost for delayed subscriptions: it adds about 10.6 ms
per 100,000 registrations compared with the first patch. The timed cleanup
bookkeeping also costs more than the original native-only path. Cleanup remains
synchronous; 10,000 simple reaction/computed pairs took a median 4.65 ms here.
More expensive user callbacks or larger backlogs can take longer.

These are Node/JSDOM measurements, excluding browser layout and paint. Application
CPU and heap improvements cannot be inferred from this benchmark. Unit tests
assert timer counts and lifecycle behavior rather than timing thresholds.

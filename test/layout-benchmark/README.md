# Auto layout runtime benchmark

This benchmark reproduces the timing procedure used in Thesis 0.7. Each PNML
is parsed and the Auto algorithm is constructed before timing. The measured
operation is exactly:

```js
const start = performance.now();
algorithm.layout(cloneGraph(source));
const duration = performance.now() - start;
```

By default, every thesis model receives eight JavaScript warm-up executions and
40 measured executions:

```bash
npm run benchmark:layout
```

Use JSON when the individual durations or environment metadata are needed:

```bash
npm run --silent benchmark:layout -- --json > auto-layout-runtime.json
```

Models and run counts can be selected for a shorter diagnostic run:

```bash
npm run benchmark:layout -- --warmups 1 --runs 3 model-23
```

Runtime values depend on the machine and its current load. Reproduction means
using the same timing boundary and sampling procedure; it does not imply that a
new run must have byte-for-byte identical durations.

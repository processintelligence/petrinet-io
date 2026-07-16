import assert from "node:assert/strict";
import test from "node:test";

import { BENCHMARK_MODELS } from "../layout-evaluation/benchmark-models.mjs";
import {
  benchmarkModel,
  measureAutoLayout,
  nearestRank,
  summarizeDurations
} from "./benchmark-auto-layout.mjs";

test("uses the nearest-rank percentile rule from the thesis benchmark", () => {
  const values = Array.from({ length: 40 }, (_value, index) => index + 1);

  assert.equal(nearestRank(values, 0.5), 20);
  assert.equal(nearestRank(values, 0.95), 38);
  assert.deepEqual(summarizeDurations([5, 2, 9, 1]), {
    medianMs: 2,
    p95Ms: 9,
    minMs: 1,
    maxMs: 9
  });
});

test("times only cloned calls to Auto.layout after the configured warm-ups", () => {
  const source = {
    nodes: [{ id: "node" }],
    edges: [{ id: "edge", source: "node", target: "node" }]
  };
  const clockValues = [10, 12, 20, 25, 30, 31];
  let callCount = 0;
  const algorithm = {
    layout(graph) {
      callCount += 1;
      assert.notEqual(graph, source);
      assert.notEqual(graph.nodes, source.nodes);
      assert.notEqual(graph.nodes[0], source.nodes[0]);
      assert.notEqual(graph.edges, source.edges);
      assert.notEqual(graph.edges[0], source.edges[0]);
      return graph;
    }
  };

  const result = measureAutoLayout({
    algorithm,
    source,
    warmupRuns: 2,
    measuredRuns: 3,
    now: () => clockValues.shift()
  });

  assert.equal(callCount, 5);
  assert.deepEqual(result.durationsMs, [2, 5, 1]);
  assert.equal(result.medianMs, 2);
  assert.equal(result.p95Ms, 5);
});

test("runs the real Auto implementation on the Model 23 benchmark", async () => {
  const model = BENCHMARK_MODELS.find((candidate) => candidate.id === "model-23");
  const result = await benchmarkModel(model, {
    warmupRuns: 0,
    measuredRuns: 1
  });

  assert.equal(result.model, "model-23");
  assert.equal(result.nodes, 13);
  assert.equal(result.arcs, 15);
  assert.equal(result.durationsMs.length, 1);
  assert.ok(Number.isFinite(result.medianMs));
  assert.ok(result.medianMs >= 0);
});

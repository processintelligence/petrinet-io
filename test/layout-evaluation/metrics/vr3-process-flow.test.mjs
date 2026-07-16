import assert from "node:assert/strict";
import test from "node:test";

import { evaluateProcessFlow } from "./vr3-process-flow.mjs";

function node(id, centerX, centerY = 0) {
  return {
    id,
    type: "transition",
    x: centerX - 0.5,
    y: centerY - 0.5,
    width: 1,
    height: 1
  };
}

function edge(id, source, target) {
  return { id, source, target, points: [] };
}

test("reports forward and backward edge shares", () => {
  const result = evaluateProcessFlow({
    nodes: [node("a", 0), node("b", 10), node("c", 5)],
    edges: [edge("forward", "a", "b"), edge("backward", "b", "c")]
  });

  assert.equal(result.raw.forwardEdgeCount, 1);
  assert.equal(result.raw.backwardEdgeCount, 1);
  assert.equal(result.raw.strictForwardScore, 0.5);
  assert.equal(result.raw.nonBackwardScore, 0.5);
});

test("reports vertical edges separately while the policy is deferred", () => {
  const result = evaluateProcessFlow({
    nodes: [node("a", 10, 0), node("b", 10, 10)],
    edges: [edge("vertical", "a", "b")]
  });

  assert.equal(result.raw.verticalEdgeCount, 1);
  assert.equal(result.raw.strictForwardScore, 0);
  assert.equal(result.raw.nonBackwardScore, 1);
  assert.equal(result.score, null);
});

test("excludes annotated cycle-closing edges", () => {
  const layout = {
    nodes: [node("a", 0), node("b", 10), node("c", 20)],
    edges: [
      edge("first", "a", "b"),
      edge("second", "b", "c"),
      edge("return", "c", "a")
    ]
  };
  const result = evaluateProcessFlow(layout, {
    annotations: { flowExcludedEdgeIds: ["return"] }
  });

  assert.deepEqual(result.raw.measuredEdgeIds, ["first", "second"]);
  assert.deepEqual(result.raw.excludedEdgeIds, ["return"]);
  assert.equal(result.raw.backwardEdgeCount, 0);
  assert.equal(result.raw.strictForwardScore, 1);
});

test("can select either candidate after the vertical-edge decision", () => {
  const layout = {
    nodes: [node("a", 0), node("b", 0)],
    edges: [edge("vertical", "a", "b")]
  };

  assert.equal(
    evaluateProcessFlow(layout, { verticalEdgePolicy: "strict" }).score,
    0
  );
  assert.equal(
    evaluateProcessFlow(layout, { verticalEdgePolicy: "non-backward" }).score,
    1
  );
});

test("is not applicable when every edge is excluded", () => {
  const layout = {
    nodes: [node("a", 0), node("b", 10)],
    edges: [edge("return", "b", "a")]
  };
  const result = evaluateProcessFlow(layout, {
    annotations: { flowExcludedEdgeIds: ["return"] }
  });

  assert.equal(result.applicable, false);
  assert.equal(result.raw.strictForwardScore, null);
  assert.equal(result.raw.nonBackwardScore, null);
});

test("rejects an exclusion that is not in the graph", () => {
  assert.throws(
    () => evaluateProcessFlow(
      { nodes: [], edges: [] },
      { annotations: { flowExcludedEdgeIds: ["missing"] } }
    ),
    /unknown edge/
  );
});

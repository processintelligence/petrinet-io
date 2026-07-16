import assert from "node:assert/strict";
import test from "node:test";

import { evaluateSplitJoinBalance } from "./vr5-split-join-balance.mjs";

function node(id, centerX, centerY, options = {}) {
  const width = options.width ?? 1;
  const height = options.height ?? 1;

  return {
    id,
    type: "transition",
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height
  };
}

function edge(id, source, target) {
  return { id, source, target, points: [] };
}

function branchLayout(joinY = 0) {
  return {
    nodes: [
      node("split", 0, 0),
      node("upper", 10, -10),
      node("lower", 10, 10),
      node("join", 20, joinY)
    ],
    edges: [
      edge("e1", "split", "upper"),
      edge("e2", "split", "lower"),
      edge("e3", "upper", "join"),
      edge("e4", "lower", "join")
    ]
  };
}

test("scores a centred mirrored split/join block perfectly", () => {
  const result = evaluateSplitJoinBalance(branchLayout());

  assert.equal(result.raw.blockCount, 1);
  assert.equal(result.raw.axisScore, 1);
  assert.equal(result.raw.entranceScore, 1);
  assert.equal(result.raw.exitScore, 1);
  assert.equal(result.raw.branchCenterScore, 1);
  assert.equal(result.score, 1);
});

test("penalizes a vertically displaced join", () => {
  const result = evaluateSplitJoinBalance(branchLayout(8));

  assert.ok(result.raw.axisScore < 1);
  assert.ok(result.score < 1);
});

test("uses rendered branch envelopes instead of mean node centres", () => {
  const layout = {
    nodes: [
      node("split", 0, 0),
      node("upperFirst", 10, -10, { height: 2 }),
      node("upperLast", 20, -2, { height: 18 }),
      node("lower", 15, 6, { height: 2 }),
      node("join", 30, 0)
    ],
    edges: [
      edge("e1", "split", "upperFirst"),
      edge("e2", "upperFirst", "upperLast"),
      edge("e3", "upperLast", "join"),
      edge("e4", "split", "lower"),
      edge("e5", "lower", "join")
    ]
  };
  const result = evaluateSplitJoinBalance(layout);
  const centers = result.details.blocks[0].branchEnvelopes.map(
    (envelope) => envelope.centerY
  );

  assert.deepEqual([...centers].sort((first, second) => first - second), [-2, 6]);
  assert.ok(result.raw.branchCenterScore < 1);
});

test("is not applicable without a matched split and join", () => {
  const result = evaluateSplitJoinBalance({
    nodes: [node("a", 0, 0), node("b", 10, 0)],
    edges: [edge("e1", "a", "b")]
  });

  assert.equal(result.applicable, false);
  assert.equal(result.score, null);
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateNodeOverlap,
  MINIMUM_NODE_CLEARANCE
} from "./vr1-node-overlap.mjs";

function node(id, type, x, y, width, height) {
  return { id, type, x, y, width, height };
}

function evaluate(nodes) {
  return evaluateNodeOverlap({ nodes, edges: [] });
}

function assertClose(actual, expected, tolerance = 1e-8) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

test("fails when two transition interiors overlap", () => {
  const result = evaluate([
    node("a", "transition", 0, 0, 10, 10),
    node("b", "transition", 5, 5, 10, 10)
  ]);

  assert.equal(result.score, null);
  assert.equal(result.raw.passed, false);
  assert.equal(result.raw.minimumClearance, 0);
  assert.equal(result.raw.violatingPairCount, 1);
});

test("fails when two node boundaries touch", () => {
  const result = evaluate([
    node("a", "transition", 0, 0, 10, 10),
    node("b", "transition", 10, 0, 10, 10)
  ]);

  assert.equal(result.raw.passed, false);
  assert.equal(result.raw.minimumClearance, 0);
  assert.equal(result.raw.violatingPairCount, 1);
});

test("fails when the positive boundary gap is below two units", () => {
  const result = evaluate([
    node("a", "transition", 0, 0, 10, 10),
    node("b", "transition", 11, 0, 10, 10)
  ]);

  assert.equal(result.raw.minimumRequiredClearance, MINIMUM_NODE_CLEARANCE);
  assert.equal(result.raw.minimumClearance, 1);
  assert.equal(result.raw.passed, false);
  assert.deepEqual(result.details.violatingPairs, [{
    firstNodeId: "a",
    secondNodeId: "b",
    clearance: 1
  }]);
});

test("passes when the boundary gap is exactly two units", () => {
  const result = evaluate([
    node("a", "transition", 0, 0, 10, 10),
    node("b", "transition", 12, 0, 10, 10)
  ]);

  assert.equal(result.raw.minimumClearance, 2);
  assert.equal(result.raw.violatingPairCount, 0);
  assert.equal(result.raw.passed, true);
});

test("measures a non-square place as its actual ellipse", () => {
  const result = evaluate([
    node("place", "place", 0, 0, 20, 10),
    node("transition", "transition", 9, 20, 2, 2)
  ]);

  assertClose(result.raw.minimumClearance, 10);
  assert.equal(result.raw.passed, true);
});

test("fails an ellipse-to-rectangle gap just below two units", () => {
  const result = evaluate([
    node("place", "place", 0, 0, 20, 10),
    node("transition", "transition", 9, 11.5, 2, 2)
  ]);

  assertClose(result.raw.minimumClearance, 1.5);
  assert.equal(result.raw.passed, false);
});

test("detects an overlap between a place ellipse and a transition", () => {
  const result = evaluate([
    node("place", "place", 0, 0, 10, 10),
    node("transition", "transition", 4, 4, 2, 2)
  ]);

  assert.equal(result.raw.minimumClearance, 0);
  assert.equal(result.raw.passed, false);
});

test("measures diagonal clearance between places", () => {
  const diagonalOffset = 12 / Math.sqrt(2);
  const result = evaluate([
    node("a", "place", 0, 0, 10, 10),
    node("b", "place", diagonalOffset, diagonalOffset, 10, 10)
  ]);

  assertClose(result.raw.minimumClearance, 2);
  assert.equal(result.raw.passed, true);
});

test("passes a layout with fewer than two nodes and reports no pair minimum", () => {
  const result = evaluate([
    node("only", "place", 0, 0, 10, 10)
  ]);

  assert.equal(result.raw.evaluatedPairCount, 0);
  assert.equal(result.raw.minimumClearance, null);
  assert.equal(result.raw.violatingPairCount, 0);
  assert.equal(result.raw.passed, true);
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_NO_CYCLE_SCORE,
  evaluateCycleCircularity
} from "./vr6-cycle-circularity.mjs";

function node(id, x, y) {
  return {
    id,
    type: "transition",
    x: x - 0.5,
    y: y - 0.5,
    width: 1,
    height: 1
  };
}

function cycleLayout(points, prefix = "") {
  const pointEntries = Object.entries(points).map(([id, point]) => ({
    id: `${prefix}${id}`,
    point
  }));
  const nodes = pointEntries.map(({ id, point }) => node(id, point.x, point.y));
  const edges = pointEntries.map(({ id: source, point }, index) => {
    const next = pointEntries[(index + 1) % pointEntries.length];

    return {
      id: `${prefix}edge-${index + 1}`,
      source,
      target: next.id,
      points: [point, next.point]
    };
  });

  return { nodes, edges };
}

function assertClose(actual, expected) {
  assert.ok(Math.abs(actual - expected) <= 1e-12, `${actual} != ${expected}`);
}

test("gives nodes on one circumference the maximum score", () => {
  const result = evaluateCycleCircularity(cycleLayout({
    a: { x: 10, y: 0 },
    b: { x: 0, y: 10 },
    c: { x: -10, y: 0 },
    d: { x: 0, y: -10 }
  }));

  assert.equal(result.raw.detectedCycleCount, 1);
  assertClose(result.score, 1);
  assertClose(result.details.cycles[0].fittedRadius, 10);
});

test("does not require equal spacing around the circumference", () => {
  const pointAt = (degrees) => {
    const radians = degrees * Math.PI / 180;
    return { x: 10 * Math.cos(radians), y: 10 * Math.sin(radians) };
  };
  const result = evaluateCycleCircularity(cycleLayout({
    a: pointAt(0),
    b: pointAt(25),
    c: pointAt(145),
    d: pointAt(260)
  }));

  assertClose(result.score, 1);
});

test("gives nodes that do not share a circumference a lower score", () => {
  const result = evaluateCycleCircularity(cycleLayout({
    a: { x: 20, y: 0 },
    b: { x: 0, y: 5 },
    c: { x: -20, y: 0 },
    d: { x: 0, y: -5 }
  }));

  assertClose(result.score, 0.4);
});

test("leaves edge-order crossings to VR4", () => {
  const result = evaluateCycleCircularity(cycleLayout({
    a: { x: 0, y: 0 },
    b: { x: 10, y: 10 },
    c: { x: 0, y: 10 },
    d: { x: 10, y: 0 }
  }));

  assertClose(result.score, 1);
});

test("gives a degenerate collinear cycle zero", () => {
  const result = evaluateCycleCircularity(cycleLayout({
    a: { x: 0, y: 0 },
    b: { x: 10, y: 0 },
    c: { x: 20, y: 0 },
    d: { x: 30, y: 0 }
  }));

  assert.equal(result.score, 0);
  assert.equal(result.details.cycles[0].fittedRadius, null);
});

test("returns one VR6 score by averaging all detected cycles", () => {
  const circular = cycleLayout({
    a: { x: 10, y: 0 },
    b: { x: 0, y: 10 },
    c: { x: -10, y: 0 },
    d: { x: 0, y: -10 }
  }, "circular-");
  const nonCircular = cycleLayout({
    a: { x: 70, y: 0 },
    b: { x: 50, y: 5 },
    c: { x: 30, y: 0 },
    d: { x: 50, y: -5 }
  }, "non-circular-");
  const result = evaluateCycleCircularity({
    nodes: [...circular.nodes, ...nonCircular.nodes],
    edges: [...circular.edges, ...nonCircular.edges]
  });

  assert.equal(result.raw.detectedCycleCount, 2);
  assertClose(result.score, 0.7);
});

test("scores a layout without cycles as zero by default", () => {
  const result = evaluateCycleCircularity({
    nodes: [node("a", 0, 0), node("b", 10, 0)],
    edges: [{
      id: "edge",
      source: "a",
      target: "b",
      points: [{ x: 0, y: 0 }, { x: 10, y: 0 }]
    }]
  });

  assert.equal(DEFAULT_NO_CYCLE_SCORE, 0);
  assert.equal(result.applicable, true);
  assert.equal(result.score, 0);
  assert.equal(result.raw.detectedCycleCount, 0);
});

test("can report a layout without cycles as not applicable", () => {
  const result = evaluateCycleCircularity({ nodes: [], edges: [] }, {
    vr6NoCycleScore: null
  });

  assert.equal(result.applicable, false);
  assert.equal(result.score, null);
});

test("excludes two-node reciprocal patterns and applies the no-cycle policy", () => {
  const result = evaluateCycleCircularity({
    nodes: [node("a", 0, 0), node("b", 10, 0)],
    edges: [
      { id: "out", source: "a", target: "b", points: [] },
      { id: "back", source: "b", target: "a", points: [] }
    ]
  });

  assert.equal(result.raw.detectedCycleCount, 0);
  assert.equal(result.score, 0);
});

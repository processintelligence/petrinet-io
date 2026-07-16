import assert from "node:assert/strict";
import test from "node:test";

import { evaluateEdgeCrossings } from "./vr4-edge-crossings.mjs";

function nodeAt(id, x, y, options = {}) {
  const width = options.width ?? 1;
  const height = options.height ?? 1;

  return {
    id,
    type: options.type ?? "transition",
    x: x - width / 2,
    y: y - height / 2,
    width,
    height
  };
}

function edge(id, source, target, points) {
  return { id, source, target, points };
}

test("penalizes an independent pair with a proper crossing", () => {
  const result = evaluateEdgeCrossings({
    nodes: [
      nodeAt("a", 0, 0), nodeAt("b", 10, 10),
      nodeAt("c", 0, 10), nodeAt("d", 10, 0)
    ],
    edges: [
      edge("first", "a", "b", [{ x: 0, y: 0 }, { x: 10, y: 10 }]),
      edge("second", "c", "d", [{ x: 0, y: 10 }, { x: 10, y: 0 }])
    ]
  });

  assert.equal(result.raw.eligiblePairCount, 1);
  assert.equal(result.raw.affectedPairCount, 1);
  assert.equal(result.raw.crossingPairCount, 1);
  assert.equal(result.raw.properIntersectionCount, 1);
  assert.equal(result.score, 0);
  assert.ok(Math.abs(result.raw.minimumCrossingAngleDegrees - 90) < 1e-9);
});

test("normalizes affected pairs against every eligible pair", () => {
  const result = evaluateEdgeCrossings({
    nodes: [
      nodeAt("a", 0, 0), nodeAt("b", 10, 10),
      nodeAt("c", 0, 10), nodeAt("d", 10, 0),
      nodeAt("e", 0, 20), nodeAt("f", 10, 20)
    ],
    edges: [
      edge("first", "a", "b", [{ x: 0, y: 0 }, { x: 10, y: 10 }]),
      edge("second", "c", "d", [{ x: 0, y: 10 }, { x: 10, y: 0 }]),
      edge("third", "e", "f", [{ x: 0, y: 20 }, { x: 10, y: 20 }])
    ]
  });

  assert.equal(result.raw.eligiblePairCount, 3);
  assert.equal(result.raw.affectedPairCount, 1);
  assert.ok(Math.abs(result.score - 2 / 3) < 1e-9);
});

test("penalizes positive collinear overlap", () => {
  const result = evaluateEdgeCrossings({
    nodes: [
      nodeAt("a", 0, 0), nodeAt("b", 10, 0),
      nodeAt("c", 5, 0), nodeAt("d", 15, 0)
    ],
    edges: [
      edge("first", "a", "b", [{ x: 0, y: 0 }, { x: 10, y: 0 }]),
      edge("second", "c", "d", [{ x: 5, y: 0 }, { x: 15, y: 0 }])
    ]
  });

  assert.equal(result.raw.overlapPairCount, 1);
  assert.equal(result.raw.crossingPairCount, 0);
  assert.equal(result.raw.affectedPairCount, 1);
  assert.equal(result.score, 0);
});

test("reports near contact without changing the score", () => {
  const result = evaluateEdgeCrossings({
    nodes: [
      nodeAt("a", 0, 0), nodeAt("b", 20, 0),
      nodeAt("c", 0, 2), nodeAt("d", 20, 2)
    ],
    edges: [
      edge("first", "a", "b", [{ x: 0, y: 0 }, { x: 20, y: 0 }]),
      edge("second", "c", "d", [{ x: 0, y: 2 }, { x: 20, y: 2 }])
    ]
  });

  assert.equal(result.raw.nearContactPairCount, 1);
  assert.equal(result.raw.affectedPairCount, 0);
  assert.equal(result.score, 1);
});

test("uses a strict three-unit near-contact boundary", () => {
  const layout = {
    nodes: [
      nodeAt("a", 0, 0), nodeAt("b", 20, 0),
      nodeAt("c", 0, 3), nodeAt("d", 20, 3)
    ],
    edges: [
      edge("first", "a", "b", [{ x: 0, y: 0 }, { x: 20, y: 0 }]),
      edge("second", "c", "d", [{ x: 0, y: 3 }, { x: 20, y: 3 }])
    ]
  };

  assert.equal(evaluateEdgeCrossings(layout).raw.nearContactPairCount, 0);
  assert.equal(
    evaluateEdgeCrossings(layout, { nearContactDistance: 4 }).raw.nearContactPairCount,
    1
  );
});

test("excludes shared-endpoint pairs from the score but reports their overlap", () => {
  const result = evaluateEdgeCrossings({
    nodes: [nodeAt("a", 0, 0), nodeAt("b", 20, 0), nodeAt("c", 20, 0)],
    edges: [
      edge("first", "a", "b", [{ x: 0, y: 0 }, { x: 20, y: 0 }]),
      edge("second", "a", "c", [{ x: 0, y: 0 }, { x: 20, y: 0 }])
    ]
  });

  assert.equal(result.raw.eligiblePairCount, 0);
  assert.equal(result.score, null);
  assert.equal(result.raw.sharedEndpointOverlapPairCount, 1);
});

test("does not report normally diverging edges at a shared endpoint", () => {
  const result = evaluateEdgeCrossings({
    nodes: [
      nodeAt("a", 0, 0, { type: "place", width: 4, height: 4 }),
      nodeAt("b", 20, 0),
      nodeAt("c", 20, 20)
    ],
    edges: [
      edge("first", "a", "b", [{ x: 0, y: 0 }, { x: 20, y: 0 }]),
      edge("second", "a", "c", [{ x: 0, y: 0 }, { x: 20, y: 20 }])
    ]
  });

  assert.equal(result.raw.eligiblePairCount, 0);
  assert.equal(result.raw.sharedEndpointOverlapPairCount, 0);
});

test("merges a crossing found on both sides of a polyline bend", () => {
  const result = evaluateEdgeCrossings({
    nodes: [
      nodeAt("a", 0, 0), nodeAt("b", 10, 0),
      nodeAt("c", 5, -2), nodeAt("d", 5, 8)
    ],
    edges: [
      edge("bent", "a", "b", [
        { x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 0 }
      ]),
      edge("vertical", "c", "d", [{ x: 5, y: -2 }, { x: 5, y: 8 }])
    ]
  });

  assert.equal(result.raw.properIntersectionCount, 1);
  assert.equal(result.raw.affectedPairCount, 1);
});

test("rejects a negative near-contact distance", () => {
  assert.throws(
    () => evaluateEdgeCrossings(
      { nodes: [], edges: [] },
      { nearContactDistance: -1 }
    ),
    /non-negative/
  );
});

import assert from "node:assert/strict";
import test from "node:test";

import { evaluateEdgeNodeOverlap } from "./vr2-edge-node-overlap.mjs";

function nodeAt(id, centerX, centerY, options = {}) {
  const width = options.width ?? 2;
  const height = options.height ?? 2;

  return {
    id,
    type: options.type ?? "transition",
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height
  };
}

function oneEdgeLayout(unrelatedNode, edgeY = 0) {
  return {
    nodes: [
      nodeAt("source", -20, edgeY),
      nodeAt("target", 20, edgeY),
      unrelatedNode
    ],
    edges: [{
      id: "edge",
      source: "source",
      target: "target",
      points: [{ x: -20, y: edgeY }, { x: 20, y: edgeY }]
    }]
  };
}

test("fails an edge that passes through an unrelated node", () => {
  const result = evaluateEdgeNodeOverlap(
    oneEdgeLayout(nodeAt("middle", 0, 0, { width: 4, height: 6 }))
  );

  assert.equal(result.score, 0);
  assert.equal(result.raw.affectedEdgeCount, 1);
  assert.deepEqual(result.raw.affectedEdgeIds, ["edge"]);
  assert.deepEqual(result.details.affectedEdges[0].violatingNodeIds, ["middle"]);
  assert.ok(Math.abs(result.details.affectedEdges[0].hiddenLength - 4) < 1e-8);
});

test("fails a positive boundary gap smaller than five units", () => {
  const result = evaluateEdgeNodeOverlap(
    oneEdgeLayout(nodeAt("near", 0, 0, { width: 4, height: 2 }), 5.5)
  );

  assert.equal(result.score, 0);
  assert.ok(Math.abs(result.details.affectedEdges[0].minimumClearance - 4.5) < 1e-8);
  assert.equal(result.details.affectedEdges[0].hiddenLength, 0);
});

test("accepts a boundary gap of exactly five units", () => {
  const result = evaluateEdgeNodeOverlap(
    oneEdgeLayout(nodeAt("near", 0, 0, { width: 4, height: 2 }), 6)
  );

  assert.equal(result.score, 1);
  assert.equal(result.raw.affectedEdgeCount, 0);
  assert.deepEqual(result.raw.compliantEdgeIds, ["edge"]);
});

test("uses the declared ellipse rather than a circular approximation", () => {
  const result = evaluateEdgeNodeOverlap(
    oneEdgeLayout(nodeAt("place", 0, 0, {
      type: "place",
      width: 12,
      height: 4
    }), 6.5)
  );

  assert.equal(result.score, 0);
  assert.ok(Math.abs(result.details.affectedEdges[0].minimumClearance - 4.5) < 1e-8);
});

test("scores the share of compliant edges, not hidden path length", () => {
  const layout = oneEdgeLayout(nodeAt("middle", 0, 0, { width: 4, height: 4 }));
  layout.nodes.push(nodeAt("upperSource", -20, 20), nodeAt("upperTarget", 20, 20));
  layout.edges.push({
    id: "clear-edge",
    source: "upperSource",
    target: "upperTarget",
    points: [{ x: -20, y: 20 }, { x: 20, y: 20 }]
  });

  const result = evaluateEdgeNodeOverlap(layout);

  assert.equal(result.raw.affectedEdgeCount, 1);
  assert.equal(result.raw.compliantEdgeCount, 1);
  assert.equal(result.score, 0.5);
});

test("excludes source and target regions", () => {
  const nodes = [
    nodeAt("source", 0, 0, { width: 8, height: 8 }),
    nodeAt("target", 10, 0, { width: 8, height: 8 })
  ];
  const result = evaluateEdgeNodeOverlap({
    nodes,
    edges: [{
      id: "edge",
      source: "source",
      target: "target",
      points: [{ x: 0, y: 0 }, { x: 10, y: 0 }]
    }]
  });

  assert.equal(result.score, 1);
  assert.equal(result.raw.affectedEdgeCount, 0);
});

test("is not applicable when there are no edges", () => {
  const result = evaluateEdgeNodeOverlap({ nodes: [], edges: [] });

  assert.equal(result.applicable, false);
  assert.equal(result.score, null);
});

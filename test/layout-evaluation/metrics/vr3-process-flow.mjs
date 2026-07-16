import { centerOf, EPSILON } from "./geometry.mjs";

const SCORE_POLICIES = new Set(["deferred", "strict", "non-backward"]);

function edgeMeasurement(edge, nodeById) {
  const sourceX = centerOf(nodeById.get(edge.source)).x;
  const targetX = centerOf(nodeById.get(edge.target)).x;
  const difference = targetX - sourceX;
  const direction = difference > EPSILON
    ? "forward"
    : difference < -EPSILON
      ? "backward"
      : "vertical";

  return {
    edgeId: edge.id,
    sourceNodeId: edge.source,
    targetNodeId: edge.target,
    sourceX,
    targetX,
    direction
  };
}

export function evaluateProcessFlow(layout, options = {}) {
  const scorePolicy = options.verticalEdgePolicy ?? "deferred";

  if (!SCORE_POLICIES.has(scorePolicy)) {
    throw new Error(
      "VR3 vertical-edge policy must be deferred, strict, or non-backward."
    );
  }

  const edgeById = new Map(layout.edges.map((edge) => [edge.id, edge]));
  const annotatedExclusions = options.annotations?.flowExcludedEdgeIds ?? [];

  if (!Array.isArray(annotatedExclusions)) {
    throw new Error("VR3 flowExcludedEdgeIds must be an array.");
  }

  const excludedEdgeIds = [...new Set(annotatedExclusions)].sort();
  const unknownExcludedEdgeIds = excludedEdgeIds.filter((edgeId) => !edgeById.has(edgeId));

  if (unknownExcludedEdgeIds.length > 0) {
    throw new Error(
      `VR3 flow exclusions reference unknown edge(s): ${unknownExcludedEdgeIds.join(", ")}.`
    );
  }

  const excludedEdgeIdSet = new Set(excludedEdgeIds);
  const nodeById = new Map(layout.nodes.map((node) => [node.id, node]));
  const measuredEdges = layout.edges
    .filter((edge) => (
      !excludedEdgeIdSet.has(edge.id) &&
      nodeById.has(edge.source) &&
      nodeById.has(edge.target)
    ))
    .map((edge) => edgeMeasurement(edge, nodeById));
  const edgesByDirection = {
    forward: measuredEdges.filter((edge) => edge.direction === "forward"),
    vertical: measuredEdges.filter((edge) => edge.direction === "vertical"),
    backward: measuredEdges.filter((edge) => edge.direction === "backward")
  };
  const applicable = measuredEdges.length > 0;
  const strictForwardScore = applicable
    ? edgesByDirection.forward.length / measuredEdges.length
    : null;
  const nonBackwardScore = applicable
    ? (edgesByDirection.forward.length + edgesByDirection.vertical.length) /
      measuredEdges.length
    : null;
  const score = scorePolicy === "strict"
    ? strictForwardScore
    : scorePolicy === "non-backward"
      ? nonBackwardScore
      : null;

  return {
    id: "VR3",
    name: "Process-flow direction",
    applicable,
    score,
    raw: {
      scorePolicy,
      measuredEdgeCount: measuredEdges.length,
      excludedEdgeCount: excludedEdgeIds.length,
      forwardEdgeCount: edgesByDirection.forward.length,
      verticalEdgeCount: edgesByDirection.vertical.length,
      backwardEdgeCount: edgesByDirection.backward.length,
      strictForwardScore,
      nonBackwardScore,
      measuredEdgeIds: measuredEdges.map((edge) => edge.edgeId),
      excludedEdgeIds
    },
    details: {
      forwardEdges: edgesByDirection.forward,
      verticalEdges: edgesByDirection.vertical,
      backwardEdges: edgesByDirection.backward
    }
  };
}

export default evaluateProcessFlow;

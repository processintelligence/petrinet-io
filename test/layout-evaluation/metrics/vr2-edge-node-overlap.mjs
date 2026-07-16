import {
  EPSILON,
  mergedIntervalLength,
  segmentLength,
  segmentNodeClearance,
  segmentNodeInterval
} from "./geometry.mjs";
import {
  clipEdgeToNodeBoundaries,
  edgeSegments
} from "./edge-geometry.mjs";

export const MINIMUM_EDGE_NODE_CLEARANCE = 5;

function evaluateEdge(edge, nodes, nodeById) {
  const renderedEdge = clipEdgeToNodeBoundaries(edge, nodeById);
  const segments = edgeSegments(renderedEdge);
  const violatingNodeIds = new Set();
  let visibleLength = 0;
  let hiddenLength = 0;
  let minimumClearance = Infinity;

  for (const segment of segments) {
    const length = segmentLength(segment.start, segment.end);
    const hiddenIntervals = [];

    visibleLength += length;

    for (const node of nodes) {
      if (node.id === edge.source || node.id === edge.target) {
        continue;
      }

      const clearance = segmentNodeClearance(segment.start, segment.end, node);
      const hiddenInterval = segmentNodeInterval(segment.start, segment.end, node);

      minimumClearance = Math.min(minimumClearance, clearance);

      if (clearance < MINIMUM_EDGE_NODE_CLEARANCE - EPSILON) {
        violatingNodeIds.add(node.id);
      }

      if (hiddenInterval) {
        hiddenIntervals.push(hiddenInterval);
      }
    }

    hiddenLength += mergedIntervalLength(hiddenIntervals) * length;
  }

  return {
    edgeId: edge.id,
    visibleLength,
    minimumClearance: Number.isFinite(minimumClearance) ? minimumClearance : null,
    hiddenLength,
    hiddenRatio: visibleLength > EPSILON ? hiddenLength / visibleLength : 0,
    violatingNodeIds: [...violatingNodeIds].sort()
  };
}

export function evaluateEdgeNodeOverlap(layout) {
  const nodeById = new Map(layout.nodes.map((node) => [node.id, node]));
  const edgeResults = layout.edges.map((edge) => evaluateEdge(edge, layout.nodes, nodeById));
  const affectedEdges = edgeResults.filter((edge) => edge.violatingNodeIds.length > 0);
  const affectedEdgeIds = affectedEdges.map((edge) => edge.edgeId);
  const affectedEdgeIdSet = new Set(affectedEdgeIds);
  const compliantEdgeIds = edgeResults
    .filter((edge) => !affectedEdgeIdSet.has(edge.edgeId))
    .map((edge) => edge.edgeId);
  const applicable = layout.edges.length > 0;
  const totalHiddenLength = edgeResults.reduce(
    (total, edge) => total + edge.hiddenLength,
    0
  );
  const meanHiddenRatio = applicable
    ? edgeResults.reduce((total, edge) => total + edge.hiddenRatio, 0) / layout.edges.length
    : null;

  return {
    id: "VR2",
    name: "Edge-node overlap avoidance",
    applicable,
    score: applicable ? 1 - affectedEdges.length / layout.edges.length : null,
    raw: {
      edgeCount: layout.edges.length,
      compliantEdgeCount: compliantEdgeIds.length,
      affectedEdgeCount: affectedEdgeIds.length,
      minimumRequiredClearance: MINIMUM_EDGE_NODE_CLEARANCE,
      totalHiddenLength,
      meanHiddenRatio,
      compliantEdgeIds,
      affectedEdgeIds
    },
    details: { affectedEdges }
  };
}

export default evaluateEdgeNodeOverlap;

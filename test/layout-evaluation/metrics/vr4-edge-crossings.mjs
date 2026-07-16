import { EPSILON } from "./geometry.mjs";
import {
  analyzeEdgePair,
  clipEdgeToNodeBoundaries,
  edgeSegments,
  edgesShareEndpoint
} from "./edge-geometry.mjs";

export const DEFAULT_NEAR_CONTACT_DISTANCE = 3;

function pairDetails(firstEdge, secondEdge, analysis) {
  return {
    firstEdgeId: firstEdge.id,
    secondEdgeId: secondEdge.id,
    properIntersections: analysis.properIntersections,
    overlaps: analysis.overlaps,
    minimumClearance: analysis.minimumClearance
  };
}

export function evaluateEdgeCrossings(layout, options = {}) {
  const nearContactDistance = options.nearContactDistance ??
    DEFAULT_NEAR_CONTACT_DISTANCE;

  if (!Number.isFinite(nearContactDistance) || nearContactDistance < 0) {
    throw new Error("VR4 near-contact distance must be a non-negative number.");
  }

  const nodeById = new Map(layout.nodes.map((node) => [node.id, node]));
  const renderedEdges = layout.edges.map(
    (edge) => clipEdgeToNodeBoundaries(edge, nodeById)
  );
  const drawableEdges = renderedEdges.filter((edge) => edgeSegments(edge).length > 0);
  const ignoredEdgeIds = renderedEdges
    .filter((edge) => edgeSegments(edge).length === 0)
    .map((edge) => edge.id);
  const affectedPairs = [];
  const crossingPairs = [];
  const overlapPairs = [];
  const nearContacts = [];
  const sharedEndpointOverlaps = [];
  const independentPairClearances = [];
  let eligiblePairCount = 0;

  for (let firstIndex = 0; firstIndex < drawableEdges.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < drawableEdges.length; secondIndex += 1) {
      const firstEdge = drawableEdges[firstIndex];
      const secondEdge = drawableEdges[secondIndex];
      const analysis = analyzeEdgePair(firstEdge, secondEdge, nodeById);
      const details = pairDetails(firstEdge, secondEdge, analysis);

      if (edgesShareEndpoint(firstEdge, secondEdge)) {
        if (analysis.overlaps.length > 0) {
          sharedEndpointOverlaps.push(details);
        }
        continue;
      }

      eligiblePairCount += 1;

      if (analysis.minimumClearance !== null) {
        independentPairClearances.push(analysis.minimumClearance);
      }

      const hasCrossing = analysis.properIntersections.length > 0;
      const hasOverlap = analysis.overlaps.length > 0;

      if (hasCrossing) {
        crossingPairs.push(details);
      }

      if (hasOverlap) {
        overlapPairs.push(details);
      }

      if (hasCrossing || hasOverlap) {
        affectedPairs.push(details);
      } else if (
        analysis.minimumClearance !== null &&
        analysis.minimumClearance < nearContactDistance - EPSILON
      ) {
        nearContacts.push(details);
      }
    }
  }

  const properIntersections = crossingPairs.flatMap((pair) => (
    pair.properIntersections.map((intersection) => ({
      firstEdgeId: pair.firstEdgeId,
      secondEdgeId: pair.secondEdgeId,
      ...intersection
    }))
  ));
  const applicable = eligiblePairCount > 0;
  const score = applicable
    ? 1 - affectedPairs.length / eligiblePairCount
    : null;

  return {
    id: "VR4",
    name: "Edge crossings",
    applicable,
    score,
    raw: {
      edgeCount: layout.edges.length,
      drawableEdgeCount: drawableEdges.length,
      ignoredEdgeCount: ignoredEdgeIds.length,
      eligiblePairCount,
      affectedPairCount: affectedPairs.length,
      crossingPairCount: crossingPairs.length,
      overlapPairCount: overlapPairs.length,
      properIntersectionCount: properIntersections.length,
      nearContactPairCount: nearContacts.length,
      sharedEndpointOverlapPairCount: sharedEndpointOverlaps.length,
      nearContactDistance,
      minimumClearance: independentPairClearances.length > 0
        ? Math.min(...independentPairClearances)
        : null,
      minimumCrossingAngleDegrees: properIntersections.length > 0
        ? Math.min(...properIntersections.map((crossing) => crossing.angleDegrees))
        : null
    },
    details: {
      ignoredEdgeIds,
      affectedPairs,
      crossingPairs,
      overlapPairs,
      properIntersections,
      nearContacts,
      sharedEndpointOverlaps
    }
  };
}

export default evaluateEdgeCrossings;

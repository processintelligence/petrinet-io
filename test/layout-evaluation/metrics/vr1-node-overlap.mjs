import { EPSILON, nodeBoundaryClearance } from "./geometry.mjs";

export const MINIMUM_NODE_CLEARANCE = 2;

function byId(first, second) {
  return String(first.id).localeCompare(String(second.id));
}

export function evaluateNodeOverlap(layout) {
  const nodes = [...layout.nodes].sort(byId);
  const violatingPairs = [];
  let minimumClearance = null;

  for (let firstIndex = 0; firstIndex < nodes.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < nodes.length; secondIndex += 1) {
      const firstNode = nodes[firstIndex];
      const secondNode = nodes[secondIndex];
      const clearance = nodeBoundaryClearance(firstNode, secondNode);

      minimumClearance = minimumClearance === null
        ? clearance
        : Math.min(minimumClearance, clearance);

      if (clearance < MINIMUM_NODE_CLEARANCE - EPSILON) {
        violatingPairs.push({
          firstNodeId: firstNode.id,
          secondNodeId: secondNode.id,
          clearance
        });
      }
    }
  }

  const passed = violatingPairs.length === 0;

  return {
    id: "VR1",
    name: "Node-overlap avoidance",
    applicable: true,
    score: null,
    raw: {
      nodeCount: nodes.length,
      evaluatedPairCount: nodes.length * (nodes.length - 1) / 2,
      minimumRequiredClearance: MINIMUM_NODE_CLEARANCE,
      minimumClearance,
      violatingPairCount: violatingPairs.length,
      passed
    },
    details: { violatingPairs }
  };
}

export default evaluateNodeOverlap;

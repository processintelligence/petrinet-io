import evaluateNodeOverlap from "./metrics/vr1-node-overlap.mjs";
import evaluateEdgeNodeOverlap from "./metrics/vr2-edge-node-overlap.mjs";
import evaluateProcessFlow from "./metrics/vr3-process-flow.mjs";
import evaluateEdgeCrossings from "./metrics/vr4-edge-crossings.mjs";
import evaluateSplitJoinBalance from "./metrics/vr5-split-join-balance.mjs";
import evaluateCycleCircularity from "./metrics/vr6-cycle-circularity.mjs";

const metrics = [
  evaluateNodeOverlap,
  evaluateEdgeNodeOverlap,
  evaluateProcessFlow,
  evaluateEdgeCrossings,
  evaluateSplitJoinBalance,
  evaluateCycleCircularity
];

export function evaluateLayout(layout, options = {}) {
  return metrics.map((evaluate) => evaluate(layout, options));
}

export default evaluateLayout;

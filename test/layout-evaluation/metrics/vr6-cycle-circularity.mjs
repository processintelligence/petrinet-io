import { centerOf, EPSILON } from "./geometry.mjs";
import { analyzeGraph, findSimpleDirectedCycles } from "./graph-structure.mjs";

// Change this to null to report layouts without cycles as not applicable.
export const DEFAULT_NO_CYCLE_SCORE = 0;

function mean(values) {
  return values.length > 0
    ? values.reduce((total, value) => total + value, 0) / values.length
    : null;
}

function detectedCycles(layout) {
  return findSimpleDirectedCycles(analyzeGraph(layout)).map((cycle, index) => ({
    id: `cycle-${index + 1}`,
    ...cycle
  }));
}

function fitCircle(points) {
  const meanX = mean(points.map((point) => point.x));
  const meanY = mean(points.map((point) => point.y));
  let sumXX = 0;
  let sumXY = 0;
  let sumYY = 0;
  let sumXZ = 0;
  let sumYZ = 0;

  for (const point of points) {
    const x = point.x - meanX;
    const y = point.y - meanY;
    const squaredDistance = x ** 2 + y ** 2;

    sumXX += x ** 2;
    sumXY += x * y;
    sumYY += y ** 2;
    sumXZ += x * squaredDistance;
    sumYZ += y * squaredDistance;
  }

  const determinant = sumXX * sumYY - sumXY ** 2;
  const determinantScale = Math.max(sumXX * sumYY, sumXY ** 2, 1);

  if (Math.abs(determinant) <= EPSILON * determinantScale) {
    return null;
  }

  const offsetX = (sumXZ * sumYY - sumYZ * sumXY) / (2 * determinant);
  const offsetY = (sumYZ * sumXX - sumXZ * sumXY) / (2 * determinant);
  const center = { x: meanX + offsetX, y: meanY + offsetY };
  const radialDistances = points.map(
    (point) => Math.hypot(point.x - center.x, point.y - center.y)
  );
  const radius = mean(radialDistances);

  if (radius <= EPSILON) {
    return null;
  }

  const radialRmse = Math.sqrt(mean(
    radialDistances.map((distance) => (distance - radius) ** 2)
  ));
  const normalizedRadialError = radialRmse / radius;

  return {
    center,
    radius,
    radialRmse,
    normalizedRadialError,
    score: Math.max(0, 1 - Math.min(1, normalizedRadialError))
  };
}

function evaluateCycle(cycle, nodeById) {
  const points = cycle.nodeIds.map((nodeId) => centerOf(nodeById.get(nodeId)));
  const circle = fitCircle(points);

  return {
    ...cycle,
    score: circle?.score ?? 0,
    fittedCenter: circle?.center ?? null,
    fittedRadius: circle?.radius ?? null,
    radialRmse: circle?.radialRmse ?? null,
    normalizedRadialError: circle?.normalizedRadialError ?? null
  };
}

function resolveNoCycleScore(options) {
  const score = Object.prototype.hasOwnProperty.call(options, "vr6NoCycleScore")
    ? options.vr6NoCycleScore
    : DEFAULT_NO_CYCLE_SCORE;

  if (
    score !== null &&
    (!Number.isFinite(score) || score < 0 || score > 1)
  ) {
    throw new Error("vr6NoCycleScore must be null or a number from 0 to 1.");
  }

  return score;
}

export function evaluateCycleCircularity(layout, options = {}) {
  const cyclesToEvaluate = detectedCycles(layout);

  if (cyclesToEvaluate.length === 0) {
    const score = resolveNoCycleScore(options);

    return {
      id: "VR6",
      name: "Cycle circularity",
      applicable: score !== null,
      score,
      raw: {
        detectedCycleCount: 0,
        noCycleScore: score
      },
      details: { cycles: [] }
    };
  }

  const nodeById = new Map(layout.nodes.map((node) => [node.id, node]));
  const cycles = cyclesToEvaluate.map((cycle) => evaluateCycle(cycle, nodeById));

  return {
    id: "VR6",
    name: "Cycle circularity",
    applicable: true,
    score: mean(cycles.map((cycle) => cycle.score)),
    raw: {
      detectedCycleCount: cycles.length,
      noCycleScore: resolveNoCycleScore(options)
    },
    details: { cycles }
  };
}

export default evaluateCycleCircularity;

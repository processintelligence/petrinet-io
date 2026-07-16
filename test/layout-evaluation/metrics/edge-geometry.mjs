import { centerOf, EPSILON, segmentLength } from "./geometry.mjs";

const INTERSECTION_POINT_MERGE_TOLERANCE = 1e-6;

function subtract(first, second) {
  return { x: first.x - second.x, y: first.y - second.y };
}

function dot(first, second) {
  return first.x * second.x + first.y * second.y;
}

function cross(first, second) {
  return first.x * second.y - first.y * second.x;
}

function distanceSquared(first, second) {
  const difference = subtract(first, second);
  return dot(difference, difference);
}

function interpolate(start, end, parameter) {
  return {
    x: start.x + (end.x - start.x) * parameter,
    y: start.y + (end.y - start.y) * parameter
  };
}

function pointInsideNode(point, node) {
  if (!node || node.width <= 0 || node.height <= 0) {
    return false;
  }

  if (node.type === "place") {
    const center = centerOf(node);
    const radiusX = node.width / 2;
    const radiusY = node.height / 2;
    const normalizedX = (point.x - center.x) / radiusX;
    const normalizedY = (point.y - center.y) / radiusY;

    return normalizedX ** 2 + normalizedY ** 2 <= 1 + EPSILON;
  }

  return (
    point.x >= node.x - EPSILON &&
    point.x <= node.x + node.width + EPSILON &&
    point.y >= node.y - EPSILON &&
    point.y <= node.y + node.height + EPSILON
  );
}

function clipStart(points, node) {
  if (points.length < 2 || !pointInsideNode(points[0], node)) {
    return points;
  }

  for (let index = 1; index < points.length; index += 1) {
    if (pointInsideNode(points[index], node)) {
      continue;
    }

    const inside = points[index - 1];
    const outside = points[index];
    let lower = 0;
    let upper = 1;

    for (let iteration = 0; iteration < 60; iteration += 1) {
      const middle = (lower + upper) / 2;

      if (pointInsideNode(interpolate(inside, outside, middle), node)) {
        lower = middle;
      } else {
        upper = middle;
      }
    }

    return [interpolate(inside, outside, upper), ...points.slice(index)];
  }

  return [];
}

export function clipEdgeToNodeBoundaries(edge, nodeById) {
  let points = edge.points.map((point) => ({ ...point }));

  points = clipStart(points, nodeById.get(edge.source));
  points = clipStart([...points].reverse(), nodeById.get(edge.target)).reverse();

  return { ...edge, points };
}

export function edgeSegments(edge) {
  const segments = [];

  for (let pointIndex = 0; pointIndex < edge.points.length - 1; pointIndex += 1) {
    const start = edge.points[pointIndex];
    const end = edge.points[pointIndex + 1];

    if (segmentLength(start, end) > EPSILON) {
      segments.push({ pointIndex, start, end });
    }
  }

  return segments;
}

export function edgesShareEndpoint(firstEdge, secondEdge) {
  return (
    firstEdge.source === secondEdge.source ||
    firstEdge.source === secondEdge.target ||
    firstEdge.target === secondEdge.source ||
    firstEdge.target === secondEdge.target
  );
}

function segmentRelation(firstStart, firstEnd, secondStart, secondEnd) {
  const firstDirection = subtract(firstEnd, firstStart);
  const secondDirection = subtract(secondEnd, secondStart);
  const betweenStarts = subtract(secondStart, firstStart);
  const denominator = cross(firstDirection, secondDirection);

  if (Math.abs(denominator) > EPSILON) {
    const firstParameter = cross(betweenStarts, secondDirection) / denominator;
    const secondParameter = cross(betweenStarts, firstDirection) / denominator;

    if (
      firstParameter < -EPSILON || firstParameter > 1 + EPSILON ||
      secondParameter < -EPSILON || secondParameter > 1 + EPSILON
    ) {
      return null;
    }

    return {
      kind: "intersection",
      point: interpolate(firstStart, firstEnd, firstParameter),
      firstParameter,
      secondParameter,
      firstDirection,
      secondDirection
    };
  }

  if (Math.abs(cross(betweenStarts, firstDirection)) > EPSILON) {
    return null;
  }

  const useX = Math.abs(firstDirection.x) >= Math.abs(firstDirection.y);
  const firstDelta = useX ? firstDirection.x : firstDirection.y;

  if (Math.abs(firstDelta) <= EPSILON) {
    return null;
  }

  const firstOrigin = useX ? firstStart.x : firstStart.y;
  const secondStartValue = useX ? secondStart.x : secondStart.y;
  const secondEndValue = useX ? secondEnd.x : secondEnd.y;
  const secondStartParameter = (secondStartValue - firstOrigin) / firstDelta;
  const secondEndParameter = (secondEndValue - firstOrigin) / firstDelta;
  const overlapStart = Math.max(0, Math.min(secondStartParameter, secondEndParameter));
  const overlapEnd = Math.min(1, Math.max(secondStartParameter, secondEndParameter));
  const overlapLength = Math.max(0, overlapEnd - overlapStart) * segmentLength(
    firstStart,
    firstEnd
  );

  if (overlapLength <= EPSILON) {
    return null;
  }

  return {
    kind: "overlap",
    start: interpolate(firstStart, firstEnd, overlapStart),
    end: interpolate(firstStart, firstEnd, overlapEnd),
    length: overlapLength
  };
}

function isEdgeEndpoint(segmentIndex, segmentCount, parameter) {
  return (
    (segmentIndex === 0 && parameter <= EPSILON) ||
    (segmentIndex === segmentCount - 1 && parameter >= 1 - EPSILON)
  );
}

function angleDegrees(firstDirection, secondDirection) {
  const firstLength = Math.hypot(firstDirection.x, firstDirection.y);
  const secondLength = Math.hypot(secondDirection.x, secondDirection.y);

  if (firstLength <= EPSILON || secondLength <= EPSILON) {
    return null;
  }

  const cosine = Math.max(-1, Math.min(
    1,
    dot(firstDirection, secondDirection) / (firstLength * secondLength)
  ));
  const angle = Math.acos(cosine) * 180 / Math.PI;

  return Math.min(angle, 180 - angle);
}

function insideAnyEndpointNode(point, firstEdge, secondEdge, nodeById) {
  const endpointIds = new Set([
    firstEdge.source,
    firstEdge.target,
    secondEdge.source,
    secondEdge.target
  ]);

  return [...endpointIds].some((nodeId) => pointInsideNode(point, nodeById.get(nodeId)));
}

function addDistinctIntersection(intersections, intersection) {
  const toleranceSquared = INTERSECTION_POINT_MERGE_TOLERANCE ** 2;
  const existing = intersections.find(
    (candidate) => distanceSquared(candidate.point, intersection.point) <= toleranceSquared
  );

  if (existing) {
    existing.angleDegrees = Math.min(existing.angleDegrees, intersection.angleDegrees);
  } else {
    intersections.push(intersection);
  }
}

function closestPointOnSegment(point, start, end) {
  const direction = subtract(end, start);
  const lengthSquared = dot(direction, direction);

  if (lengthSquared <= EPSILON ** 2) {
    return start;
  }

  const parameter = Math.max(0, Math.min(
    1,
    dot(subtract(point, start), direction) / lengthSquared
  ));

  return interpolate(start, end, parameter);
}

function closestSegmentPoints(firstStart, firstEnd, secondStart, secondEnd) {
  const relation = segmentRelation(firstStart, firstEnd, secondStart, secondEnd);

  if (relation?.kind === "intersection") {
    return {
      firstPoint: relation.point,
      secondPoint: relation.point,
      distanceSquared: 0
    };
  }

  if (relation?.kind === "overlap") {
    const midpoint = interpolate(relation.start, relation.end, 0.5);

    return { firstPoint: midpoint, secondPoint: midpoint, distanceSquared: 0 };
  }

  const candidates = [
    {
      firstPoint: firstStart,
      secondPoint: closestPointOnSegment(firstStart, secondStart, secondEnd)
    },
    {
      firstPoint: firstEnd,
      secondPoint: closestPointOnSegment(firstEnd, secondStart, secondEnd)
    },
    {
      firstPoint: closestPointOnSegment(secondStart, firstStart, firstEnd),
      secondPoint: secondStart
    },
    {
      firstPoint: closestPointOnSegment(secondEnd, firstStart, firstEnd),
      secondPoint: secondEnd
    }
  ];

  return candidates
    .map((candidate) => ({
      ...candidate,
      distanceSquared: distanceSquared(candidate.firstPoint, candidate.secondPoint)
    }))
    .reduce((best, candidate) => (
      candidate.distanceSquared < best.distanceSquared ? candidate : best
    ));
}

export function analyzeEdgePair(firstEdge, secondEdge, nodeById) {
  const firstSegments = edgeSegments(firstEdge);
  const secondSegments = edgeSegments(secondEdge);
  const properIntersections = [];
  const overlaps = [];
  let closest = null;

  for (let firstIndex = 0; firstIndex < firstSegments.length; firstIndex += 1) {
    const firstSegment = firstSegments[firstIndex];

    for (let secondIndex = 0; secondIndex < secondSegments.length; secondIndex += 1) {
      const secondSegment = secondSegments[secondIndex];
      const relation = segmentRelation(
        firstSegment.start,
        firstSegment.end,
        secondSegment.start,
        secondSegment.end
      );

      if (relation?.kind === "intersection") {
        const atEdgeEndpoint = (
          isEdgeEndpoint(firstIndex, firstSegments.length, relation.firstParameter) ||
          isEdgeEndpoint(secondIndex, secondSegments.length, relation.secondParameter)
        );
        const insideEndpointNode = insideAnyEndpointNode(
          relation.point,
          firstEdge,
          secondEdge,
          nodeById
        );

        if (!atEdgeEndpoint && !insideEndpointNode) {
          const intersectionAngle = angleDegrees(
            relation.firstDirection,
            relation.secondDirection
          );

          if (intersectionAngle !== null && intersectionAngle > EPSILON) {
            addDistinctIntersection(properIntersections, {
              point: relation.point,
              angleDegrees: intersectionAngle
            });
          }
        }
      } else if (relation?.kind === "overlap") {
        overlaps.push(relation);
      }

      const candidate = closestSegmentPoints(
        firstSegment.start,
        firstSegment.end,
        secondSegment.start,
        secondSegment.end
      );

      if (!closest || candidate.distanceSquared < closest.distanceSquared) {
        closest = candidate;
      }
    }
  }

  return {
    properIntersections,
    overlaps,
    minimumClearance: closest ? Math.sqrt(closest.distanceSquared) : null,
    closestPoint: closest ? {
      x: (closest.firstPoint.x + closest.secondPoint.x) / 2,
      y: (closest.firstPoint.y + closest.secondPoint.y) / 2
    } : null
  };
}

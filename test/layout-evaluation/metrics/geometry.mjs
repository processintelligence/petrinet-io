export const EPSILON = 1e-9;

export function centerOf(node) {
  return {
    x: node.x + node.width / 2,
    y: node.y + node.height / 2
  };
}

export function segmentLength(start, end) {
  return Math.hypot(end.x - start.x, end.y - start.y);
}

const GJK_MAX_ITERATIONS = 128;
const GJK_RELATIVE_TOLERANCE = 1e-12;

function dot(first, second) {
  return first.x * second.x + first.y * second.y;
}

function subtract(first, second) {
  return {
    x: first.x - second.x,
    y: first.y - second.y
  };
}

function squaredLength(vector) {
  return dot(vector, vector);
}

function cross(first, second) {
  return first.x * second.y - first.y * second.x;
}

function rectangleSupport(node, direction) {
  return {
    x: direction.x >= 0 ? node.x + node.width : node.x,
    y: direction.y >= 0 ? node.y + node.height : node.y
  };
}

function segmentSupport(segment, direction) {
  return dot(segment.start, direction) >= dot(segment.end, direction)
    ? segment.start
    : segment.end;
}

function ellipseSupport(node, direction) {
  const center = centerOf(node);
  const radiusX = node.width / 2;
  const radiusY = node.height / 2;
  const denominator = Math.hypot(radiusX * direction.x, radiusY * direction.y);

  if (denominator <= EPSILON) {
    return center;
  }

  return {
    x: center.x + radiusX ** 2 * direction.x / denominator,
    y: center.y + radiusY ** 2 * direction.y / denominator
  };
}

function shapeCenter(shape) {
  if (shape.geometryType === "segment") {
    return {
      x: (shape.start.x + shape.end.x) / 2,
      y: (shape.start.y + shape.end.y) / 2
    };
  }

  return centerOf(shape);
}

function shapeSupport(shape, direction) {
  if (shape.geometryType === "segment") {
    return segmentSupport(shape, direction);
  }

  return shape.type === "place"
    ? ellipseSupport(shape, direction)
    : rectangleSupport(shape, direction);
}

function minkowskiSupport(first, second, direction) {
  return subtract(
    shapeSupport(first, direction),
    shapeSupport(second, { x: -direction.x, y: -direction.y })
  );
}

function closestPointOnSegment(first, second) {
  const segment = subtract(second, first);
  const segmentLengthSquared = squaredLength(segment);

  if (segmentLengthSquared <= EPSILON ** 2) {
    return { point: first, simplex: [first] };
  }

  const parameter = Math.max(0, Math.min(1, -dot(first, segment) / segmentLengthSquared));

  if (parameter <= EPSILON) {
    return { point: first, simplex: [first] };
  }

  if (parameter >= 1 - EPSILON) {
    return { point: second, simplex: [second] };
  }

  return {
    point: {
      x: first.x + parameter * segment.x,
      y: first.y + parameter * segment.y
    },
    simplex: [first, second]
  };
}

function closestPointOnTriangle(first, second, third) {
  const firstToSecond = subtract(second, first);
  const firstToThird = subtract(third, first);
  const area = cross(firstToSecond, firstToThird);

  if (Math.abs(area) > EPSILON) {
    const sideOne = cross(firstToSecond, { x: -first.x, y: -first.y });
    const secondToThird = subtract(third, second);
    const sideTwo = cross(secondToThird, { x: -second.x, y: -second.y });
    const thirdToFirst = subtract(first, third);
    const sideThree = cross(thirdToFirst, { x: -third.x, y: -third.y });
    const hasNegative = sideOne < -EPSILON || sideTwo < -EPSILON || sideThree < -EPSILON;
    const hasPositive = sideOne > EPSILON || sideTwo > EPSILON || sideThree > EPSILON;

    if (!hasNegative || !hasPositive) {
      return {
        point: { x: 0, y: 0 },
        simplex: [first, second, third],
        containsOrigin: true
      };
    }
  }

  const candidates = [
    closestPointOnSegment(first, second),
    closestPointOnSegment(second, third),
    closestPointOnSegment(third, first)
  ].sort((left, right) => squaredLength(left.point) - squaredLength(right.point));

  return candidates[0];
}

function closestPointToOrigin(simplex) {
  if (simplex.length === 1) {
    return { point: simplex[0], simplex };
  }

  if (simplex.length === 2) {
    return closestPointOnSegment(simplex[0], simplex[1]);
  }

  return closestPointOnTriangle(simplex[0], simplex[1], simplex[2]);
}

function convexShapeDistance(first, second) {
  const firstCenter = shapeCenter(first);
  const secondCenter = shapeCenter(second);
  let direction = subtract(secondCenter, firstCenter);

  if (squaredLength(direction) <= EPSILON ** 2) {
    direction = { x: 1, y: 0 };
  }

  let simplex = [minkowskiSupport(first, second, direction)];
  let closest = simplex[0];

  for (let iteration = 0; iteration < GJK_MAX_ITERATIONS; iteration += 1) {
    const distanceSquared = squaredLength(closest);

    if (distanceSquared <= EPSILON ** 2) {
      return 0;
    }

    direction = { x: -closest.x, y: -closest.y };
    const candidate = minkowskiSupport(first, second, direction);
    const improvement = dot(candidate, direction) - dot(closest, direction);
    const tolerance = GJK_RELATIVE_TOLERANCE * Math.max(1, distanceSquared);

    if (improvement <= tolerance) {
      return Math.sqrt(distanceSquared);
    }

    if (simplex.some((point) => squaredLength(subtract(point, candidate)) <= EPSILON ** 2)) {
      return Math.sqrt(distanceSquared);
    }

    const result = closestPointToOrigin([...simplex, candidate]);

    if (result.containsOrigin || squaredLength(result.point) <= EPSILON ** 2) {
      return 0;
    }

    simplex = result.simplex;
    closest = result.point;
  }

  return Math.sqrt(squaredLength(closest));
}

function rectangleBoundaryClearance(first, second) {
  const horizontalGap = Math.max(
    first.x - (second.x + second.width),
    second.x - (first.x + first.width),
    0
  );
  const verticalGap = Math.max(
    first.y - (second.y + second.height),
    second.y - (first.y + first.height),
    0
  );

  return Math.hypot(horizontalGap, verticalGap);
}

export function nodeBoundaryClearance(first, second) {
  if (first.type !== "place" && second.type !== "place") {
    return rectangleBoundaryClearance(first, second);
  }

  return convexShapeDistance(first, second);
}

export function segmentNodeClearance(start, end, node) {
  return convexShapeDistance(
    { geometryType: "segment", start, end },
    node
  );
}

function rectangleInterval(start, end, node) {
  const direction = {
    x: end.x - start.x,
    y: end.y - start.y
  };
  let minimum = 0;
  let maximum = 1;

  for (const axis of ["x", "y"]) {
    const lower = node[axis];
    const upper = lower + (axis === "x" ? node.width : node.height);
    const origin = start[axis];
    const delta = direction[axis];

    if (Math.abs(delta) <= EPSILON) {
      if (origin < lower - EPSILON || origin > upper + EPSILON) {
        return null;
      }
      continue;
    }

    const first = (lower - origin) / delta;
    const second = (upper - origin) / delta;
    minimum = Math.max(minimum, Math.min(first, second));
    maximum = Math.min(maximum, Math.max(first, second));

    if (maximum - minimum <= EPSILON) {
      return null;
    }
  }

  return { start: minimum, end: maximum };
}

function ellipseInterval(start, end, node) {
  const radiusX = node.width / 2;
  const radiusY = node.height / 2;

  if (radiusX <= EPSILON || radiusY <= EPSILON) {
    return null;
  }

  const center = centerOf(node);
  const originX = (start.x - center.x) / radiusX;
  const originY = (start.y - center.y) / radiusY;
  const directionX = (end.x - start.x) / radiusX;
  const directionY = (end.y - start.y) / radiusY;
  const quadratic = directionX * directionX + directionY * directionY;
  const linear = 2 * (originX * directionX + originY * directionY);
  const constant = originX * originX + originY * originY - 1;
  const discriminant = linear * linear - 4 * quadratic * constant;

  if (quadratic <= EPSILON || discriminant < -EPSILON) {
    return null;
  }

  const root = Math.sqrt(Math.max(0, discriminant));
  const first = (-linear - root) / (2 * quadratic);
  const second = (-linear + root) / (2 * quadratic);
  const minimum = Math.max(0, Math.min(first, second));
  const maximum = Math.min(1, Math.max(first, second));

  return maximum - minimum > EPSILON
    ? { start: minimum, end: maximum }
    : null;
}

export function segmentNodeInterval(start, end, node) {
  return node.type === "place"
    ? ellipseInterval(start, end, node)
    : rectangleInterval(start, end, node);
}

export function mergedIntervalLength(intervals) {
  if (intervals.length === 0) {
    return 0;
  }

  const ordered = [...intervals].sort((first, second) => first.start - second.start);
  let currentStart = ordered[0].start;
  let currentEnd = ordered[0].end;
  let total = 0;

  for (const interval of ordered.slice(1)) {
    if (interval.start <= currentEnd + EPSILON) {
      currentEnd = Math.max(currentEnd, interval.end);
    } else {
      total += currentEnd - currentStart;
      currentStart = interval.start;
      currentEnd = interval.end;
    }
  }

  return total + currentEnd - currentStart;
}

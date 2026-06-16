import {
  asTRBL,
  getMid,
  getOrientation
} from 'diagram-js/lib/layout/LayoutUtil.js';

import {
  generateGetNextPosition,
  getConnectedDistance
} from 'diagram-js/lib/features/auto-place/AutoPlaceUtil.js';

const DEFAULT_DISTANCE = 50;
const LANE_DISTANCE = 40;
const COLLISION_PAD = 10;

export function getNewShapePosition(source, shape) {
  const sourceBounds = asTRBL(source);
  const sourceMid = getMid(source);
  const connectedDistance = getConnectedDistance(source, {
    defaultDistance: DEFAULT_DISTANCE,
    direction: 'e',
    filter: isPetriConnection
  });

  const position = {
    x: sourceBounds.right + connectedDistance + shape.width / 2,
    y: sourceMid.y
  };

  return findFreeSiblingPosition(
    source,
    shape,
    position,
    generateGetNextPosition({
      y: {
        margin: LANE_DISTANCE,
        minDistance: shape.height
      }
    })
  );
}

function findFreeSiblingPosition(source, shape, position, getNextPosition) {
  let collidingShape;

  while ((collidingShape = getShapeAtPosition(source, shape, position))) {
    position = getNextPosition(shape, position, collidingShape);
  }

  return position;
}

function getShapeAtPosition(source, shape, position) {
  const bounds = {
    x: position.x - shape.width / 2,
    y: position.y - shape.height / 2,
    width: shape.width,
    height: shape.height
  };

  const siblings = source.parent && source.parent.children || [];

  return siblings.find((sibling) => {
    if (
      sibling === source ||
      sibling === shape ||
      sibling.waypoints ||
      sibling.hidden ||
      !isFinite(sibling.x) ||
      !isFinite(sibling.y) ||
      !isFinite(sibling.width) ||
      !isFinite(sibling.height)
    ) {
      return false;
    }

    return getOrientation(sibling, bounds, COLLISION_PAD) === 'intersect';
  });
}

function isPetriConnection(connection) {
  return connection.type === 'petri:connection';
}

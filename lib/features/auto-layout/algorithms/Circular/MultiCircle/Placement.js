export default class Placement {

  constructor() {
    this.angularGap = Math.PI / 12;
    this.blockGap = 90;
    this.rootCenter = { x: 600, y: 480 };
    this.rootGap = 260;
  }

  place(petriNet) {
    const decomposition = petriNet.circularDecomposition;
    const blockLayoutById = petriNet.circularBlockLayoutById;
    const parentInfoByBlockId = petriNet.circularParentInfoByBlockId;

    if (!decomposition || !blockLayoutById || !parentInfoByBlockId) {
      return petriNet;
    }

    return {
      ...petriNet,
      circularTransformsByBlockId: this.buildTransforms(
        decomposition,
        blockLayoutById,
        parentInfoByBlockId
      )
    };
  }

  buildTransforms(decomposition, blockLayoutById, parentInfoByBlockId) {
    const blockById = new Map(decomposition.blocks.map((block) => [block.id, block]));
    const transformsByBlockId = new Map();
    const rootMetrics = this.getRootBlockIds(parentInfoByBlockId).map((blockId) =>
      this.measureSubtree(blockId, blockById, blockLayoutById, parentInfoByBlockId)
    );

    if (rootMetrics.length === 1) {
      this.placeSubtree(
        rootMetrics[0],
        this.rootCenter,
        -Math.PI,
        Math.PI,
        null,
        transformsByBlockId,
        blockLayoutById,
        parentInfoByBlockId
      );

      return transformsByBlockId;
    }

    this.placeRootRing(rootMetrics, transformsByBlockId, blockLayoutById, parentInfoByBlockId);

    return transformsByBlockId;
  }

  getRootBlockIds(parentInfoByBlockId) {
    return [...parentInfoByBlockId.entries()]
      .filter(([, info]) => info.parentBlockId === null)
      .map(([blockId]) => blockId)
      .sort((blockIdA, blockIdB) => String(blockIdA).localeCompare(String(blockIdB)));
  }

  placeRootRing(rootMetrics, transformsByBlockId, blockLayoutById, parentInfoByBlockId) {
    const rootRingRadius = Math.max(
      260,
      ...rootMetrics.map((metric) => metric.subtreeRadius + this.rootGap)
    );

    rootMetrics.forEach((metric, index) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * index) / rootMetrics.length;
      const center = this.pointFrom(this.rootCenter, angle, rootRingRadius);

      this.placeSubtree(
        metric,
        center,
        angle - Math.PI / rootMetrics.length,
        angle + Math.PI / rootMetrics.length,
        null,
        transformsByBlockId,
        blockLayoutById,
        parentInfoByBlockId
      );
    });
  }

  measureSubtree(blockId, blockById, blockLayoutById, parentInfoByBlockId) {
    const childMetrics = (parentInfoByBlockId.get(blockId)?.childBlockIds || []).map((childBlockId) =>
      this.measureSubtree(childBlockId, blockById, blockLayoutById, parentInfoByBlockId)
    );
    const radius = blockLayoutById.get(blockId)?.circularRadius || this.getFallbackRadius(blockById.get(blockId));
    const leafCount = childMetrics.reduce((total, childMetric) => total + childMetric.leafCount, 0) || 1;
    const childRadius = childMetrics.length > 0
      ? Math.max(...childMetrics.map((childMetric) => childMetric.subtreeRadius))
      : 0;

    return {
      blockId,
      radius,
      leafCount,
      subtreeRadius: radius + (childMetrics.length > 0 ? this.blockGap + childRadius : 0),
      childMetrics
    };
  }

  placeSubtree(
    subtree,
    center,
    sectorStart,
    sectorEnd,
    parentCenter,
    transformsByBlockId,
    blockLayoutById,
    parentInfoByBlockId,
    rotationOverride = null
  ) {
    transformsByBlockId.set(subtree.blockId, {
      center,
      rotation: rotationOverride ?? this.getRotationTowardParent(
        subtree.blockId,
        center,
        parentCenter,
        blockLayoutById,
        parentInfoByBlockId
      )
    });

    for (const placement of this.buildChildPlacements(
      subtree,
      center,
      sectorStart,
      sectorEnd,
      transformsByBlockId,
      blockLayoutById,
      parentInfoByBlockId
    )) {
      const childTransform = this.buildChildTransform(placement, blockLayoutById);

      this.placeSubtree(
        placement.childMetric,
        childTransform.center,
        placement.sectorStart,
        placement.sectorEnd,
        placement.anchor,
        transformsByBlockId,
        blockLayoutById,
        parentInfoByBlockId,
        childTransform.rotation
      );
    }
  }

  buildChildPlacements(
    subtree,
    center,
    sectorStart,
    sectorEnd,
    transformsByBlockId,
    blockLayoutById,
    parentInfoByBlockId
  ) {
    const anchoredChildren = this.getAnchoredChildren(
      subtree,
      center,
      transformsByBlockId,
      blockLayoutById,
      parentInfoByBlockId
    );

    if (anchoredChildren.length <= 1) {
      return anchoredChildren.map((child) => ({
        ...child,
        angle: this.projectAngleToSector(child.idealAngle, sectorStart, sectorEnd),
        sectorStart,
        sectorEnd
      }));
    }

    return this.spreadChildrenInSector(anchoredChildren, sectorStart, sectorEnd);
  }

  getAnchoredChildren(subtree, center, transformsByBlockId, blockLayoutById, parentInfoByBlockId) {
    const parentLayout = blockLayoutById.get(subtree.blockId);
    const parentTransform = transformsByBlockId.get(subtree.blockId);

    return subtree.childMetrics
      .map((childMetric) => {
        const articulationNodeId = parentInfoByBlockId.get(childMetric.blockId)?.articulationNodeId;
        const anchor = this.transformNodeCenter(parentLayout, parentTransform, articulationNodeId) || center;

        return {
          childMetric,
          articulationNodeId,
          anchor,
          idealAngle: Math.atan2(anchor.y - center.y, anchor.x - center.x)
        };
      })
      .sort((childA, childB) => {
        const angleDelta = this.normalizeAngle(childA.idealAngle) - this.normalizeAngle(childB.idealAngle);

        if (angleDelta !== 0) {
          return angleDelta;
        }

        return String(childA.childMetric.blockId).localeCompare(String(childB.childMetric.blockId));
      });
  }

  spreadChildrenInSector(children, sectorStart, sectorEnd) {
    const totalWeight = children.reduce((total, child) => total + child.childMetric.leafCount, 0);
    const availableAngle = Math.max(0.1, sectorEnd - sectorStart - this.angularGap * (children.length - 1));
    const groupIndexByKey = new Map();
    const groupSizeByKey = this.countChildrenByArticulation(children);

    return children.map((child) => {
      const span = availableAngle * child.childMetric.leafCount / totalWeight;
      const groupOffset = this.getGroupOffset(child, groupIndexByKey, groupSizeByKey);
      const angle = this.projectAngleToSector(child.idealAngle + groupOffset, sectorStart, sectorEnd);

      return {
        ...child,
        angle,
        sectorStart: angle - span / 2,
        sectorEnd: angle + span / 2
      };
    });
  }

  countChildrenByArticulation(children) {
    return children.reduce((sizes, child) => {
      const key = this.getArticulationGroupKey(child);

      sizes.set(key, (sizes.get(key) || 0) + 1);

      return sizes;
    }, new Map());
  }

  getGroupOffset(child, groupIndexByKey, groupSizeByKey) {
    const key = this.getArticulationGroupKey(child);
    const groupIndex = groupIndexByKey.get(key) || 0;
    const groupSize = groupSizeByKey.get(key) || 1;

    groupIndexByKey.set(key, groupIndex + 1);

    return (groupIndex - (groupSize - 1) / 2) * this.angularGap;
  }

  getArticulationGroupKey(child) {
    return child.articulationNodeId || child.childMetric.blockId;
  }

  getRotationTowardParent(blockId, center, parentCenter, blockLayoutById, parentInfoByBlockId) {
    if (!parentCenter) {
      return 0;
    }

    const articulationNodeId = parentInfoByBlockId.get(blockId)?.articulationNodeId;
    const blockLayout = blockLayoutById.get(blockId);
    const articulationCenter = this.getNodeCenter(blockLayout, articulationNodeId);

    if (!blockLayout?.circularCenter || !articulationCenter) {
      return 0;
    }

    return this.angleBetween(articulationCenter, blockLayout.circularCenter) -
      this.angleBetween(parentCenter, center);
  }

  buildChildTransform(placement, blockLayoutById) {
    const childLayout = blockLayoutById.get(placement.childMetric.blockId);
    const articulationCenter = this.getNodeCenter(childLayout, placement.articulationNodeId);

    if (!childLayout?.circularCenter || !articulationCenter) {
      return {
        center: this.pointFrom(placement.anchor, placement.angle, placement.childMetric.radius + this.blockGap),
        rotation: 0
      };
    }

    const localVector = {
      x: articulationCenter.x - childLayout.circularCenter.x,
      y: articulationCenter.y - childLayout.circularCenter.y
    };
    const currentAngle = Math.atan2(localVector.y, localVector.x);
    const rotation = placement.angle + Math.PI - currentAngle;
    const rotatedVector = this.rotate(localVector, rotation);

    return {
      center: {
        x: placement.anchor.x - rotatedVector.x,
        y: placement.anchor.y - rotatedVector.y
      },
      rotation
    };
  }

  transformNodeCenter(blockLayout, transform, nodeId) {
    const localCenter = this.getNodeCenter(blockLayout, nodeId);

    if (!localCenter || !blockLayout?.circularCenter || !transform) {
      return null;
    }

    const relative = {
      x: localCenter.x - blockLayout.circularCenter.x,
      y: localCenter.y - blockLayout.circularCenter.y
    };
    const rotated = this.rotate(relative, transform.rotation);

    return {
      x: transform.center.x + rotated.x,
      y: transform.center.y + rotated.y
    };
  }

  getNodeCenter(blockLayout, nodeId) {
    const node = blockLayout?.nodes.find((candidate) => candidate.id === nodeId);

    if (!node) {
      return null;
    }

    return {
      x: node.x + node.width / 2,
      y: node.y + node.height / 2
    };
  }

  pointFrom(point, angle, distance) {
    return {
      x: point.x + Math.cos(angle) * distance,
      y: point.y + Math.sin(angle) * distance
    };
  }

  angleBetween(point, origin) {
    return Math.atan2(point.y - origin.y, point.x - origin.x);
  }

  rotate(point, angle) {
    return {
      x: point.x * Math.cos(angle) - point.y * Math.sin(angle),
      y: point.x * Math.sin(angle) + point.y * Math.cos(angle)
    };
  }

  normalizeAngle(angle) {
    return (angle + 2 * Math.PI) % (2 * Math.PI);
  }

  projectAngleToSector(angle, sectorStart, sectorEnd) {
    if (Math.abs(sectorEnd - sectorStart) >= 2 * Math.PI - 0.001) {
      return angle;
    }

    const sectorMiddle = (sectorStart + sectorEnd) / 2;
    const normalizedAngle = this.normalizeAngleNear(angle, sectorMiddle);

    return Math.min(
      Math.max(normalizedAngle, sectorStart + this.angularGap / 2),
      sectorEnd - this.angularGap / 2
    );
  }

  normalizeAngleNear(angle, referenceAngle) {
    let normalizedAngle = angle;

    while (normalizedAngle - referenceAngle > Math.PI) {
      normalizedAngle -= 2 * Math.PI;
    }

    while (normalizedAngle - referenceAngle < -Math.PI) {
      normalizedAngle += 2 * Math.PI;
    }

    return normalizedAngle;
  }

  getFallbackRadius(block) {
    return Math.max(120, ((block?.nodeIds.length || 1) * 80) / (2 * Math.PI));
  }
}

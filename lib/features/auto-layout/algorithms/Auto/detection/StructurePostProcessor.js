export default class StructurePostProcessor {

  normalizeBranchJoinOwnership(regions, context, ancestorExitNodeIds = new Set()) {
    for (const region of regions || []) {
      if (region.type !== "branch") {
        this.normalizeBranchJoinOwnership(region.children || [], context, ancestorExitNodeIds);
        continue;
      }

      const originalExitNodeId = region.exitNodeId;
      const inheritedExitNodeIds = new Set(ancestorExitNodeIds);
      const usesAncestorJoin = originalExitNodeId && inheritedExitNodeIds.has(originalExitNodeId);

      if (inheritedExitNodeIds.size > 0) {
        region.nodeIds = (region.nodeIds || [])
          .filter((nodeId) => nodeId === region.entryNodeId || !inheritedExitNodeIds.has(nodeId));
        region.joinNodeIds = (region.joinNodeIds || [])
          .filter((nodeId) => !inheritedExitNodeIds.has(nodeId));
        region.parentJoinNodeIds = (region.parentJoinNodeIds || [])
          .filter((nodeId) => !inheritedExitNodeIds.has(nodeId));
        region.edgeIds = context.edgeIdsInside(region.nodeIds);
      }

      if (usesAncestorJoin) {
        region.inheritedExitNodeId = originalExitNodeId;
        region.exitNodeId = null;
      }

      const childAncestorExitNodeIds = new Set(inheritedExitNodeIds);

      if (originalExitNodeId) {
        childAncestorExitNodeIds.add(originalExitNodeId);
      }

      this.normalizeBranchJoinOwnership(region.children || [], context, childAncestorExitNodeIds);
      this.promoteDirectJoinOwnership(region);
    }
  }

  promoteDirectJoinOwnership(region) {
    const childBranchNodeIds = new Set(
      (region.children || [])
        .filter((child) => child.type === "branch")
        .flatMap((child) => child.nodeIds || [])
    );
    const directlyOwnedJoinNodeIds = (region.joinNodeIds || [])
      .filter((nodeId) => !childBranchNodeIds.has(nodeId));

    region.parentJoinNodeIds = this.uniqueSorted([
      ...(region.parentJoinNodeIds || []),
      ...directlyOwnedJoinNodeIds,
      region.exitNodeId
    ].filter((nodeId) => nodeId));
  }

  attachBoundaryNodesToAdjacentRegions(regions, context) {
    let changed = true;

    while (changed) {
      changed = false;

      const regionInfo = this.buildRegionInfo(regions);
      const regionByNodeId = this.buildDeepestRegionByNodeId(regionInfo.regions);
      const boundaryNodeIds = context.analysis.nodes
        .map((node) => node.id)
        .filter((nodeId) => !regionByNodeId.has(nodeId))
        .filter((nodeId) => this.isBoundaryNode(nodeId, context));

      for (const nodeId of boundaryNodeIds) {
        const adjacentRegion = this.findAdjacentRegion(nodeId, regionByNodeId, context);

        if (!adjacentRegion) {
          continue;
        }

        this.addNodeToRegionAndAncestors(nodeId, adjacentRegion, regionInfo.parentByRegion, context);
        changed = true;
      }
    }
  }

  mergeOverlappingRegions(regions, context) {
    const mergedRegions = [];

    for (const region of regions) {
      const overlappingRegion = mergedRegions.find((candidate) =>
        this.regionsOverlap(candidate, region)
      );

      if (!overlappingRegion) {
        mergedRegions.push({ ...region });
        continue;
      }

      overlappingRegion.id = `${overlappingRegion.id}+${region.id}`;
      overlappingRegion.nodeIds = this.uniqueSorted([
        ...(overlappingRegion.nodeIds || []),
        ...(region.nodeIds || [])
      ]);
      overlappingRegion.edgeIds = context.edgeIdsInside(overlappingRegion.nodeIds);
    }

    return mergedRegions;
  }

  regionsOverlap(first, second) {
    const firstNodeIds = new Set(first.nodeIds || []);

    return (second.nodeIds || []).some((nodeId) => firstNodeIds.has(nodeId));
  }

  buildRegionInfo(regions) {
    const allRegions = [];
    const parentByRegion = new Map();

    const visit = (region, parent = null) => {
      allRegions.push(region);

      if (parent) {
        parentByRegion.set(region, parent);
      }

      for (const child of region.children || []) {
        visit(child, region);
      }
    };

    for (const region of regions) {
      visit(region);
    }

    return {
      regions: allRegions,
      parentByRegion
    };
  }

  buildDeepestRegionByNodeId(regions) {
    const regionByNodeId = new Map();

    for (const region of [...regions].sort((first, second) =>
      (second.nodeIds || []).length - (first.nodeIds || []).length
    )) {
      for (const nodeId of region.nodeIds || []) {
        regionByNodeId.set(nodeId, region);
      }
    }

    return regionByNodeId;
  }

  isBoundaryNode(nodeId, context) {
    const incoming = context.analysis.incomingByNodeId.get(nodeId) || [];
    const outgoing = context.analysis.outgoingByNodeId.get(nodeId) || [];

    return incoming.length === 0 || outgoing.length === 0;
  }

  findAdjacentRegion(nodeId, regionByNodeId, context) {
    const incoming = context.analysis.incomingByNodeId.get(nodeId) || [];
    const outgoing = context.analysis.outgoingByNodeId.get(nodeId) || [];

    for (const edge of outgoing) {
      const region = regionByNodeId.get(edge.target);

      if (region) {
        return region;
      }
    }

    for (const edge of incoming) {
      const region = regionByNodeId.get(edge.source);

      if (region) {
        return region;
      }
    }

    return null;
  }

  addNodeToRegionAndAncestors(nodeId, region, parentByRegion, context) {
    let currentRegion = region;

    while (currentRegion) {
      this.addNodeToRegion(nodeId, currentRegion, context);
      currentRegion = parentByRegion.get(currentRegion);
    }
  }

  addNodeToRegion(nodeId, region, context) {
    region.nodeIds = this.uniqueSorted([
      ...(region.nodeIds || []),
      nodeId
    ]);
    region.absorbedBoundaryNodeIds = this.uniqueSorted([
      ...(region.absorbedBoundaryNodeIds || []),
      nodeId
    ]);
    region.edgeIds = context.edgeIdsInside(region.nodeIds);
  }

  uniqueSorted(values) {
    return [...new Set(values)]
      .sort((first, second) => String(first).localeCompare(String(second)));
  }
}

import {
  isOpaqueRegionType,
  opaqueRegionPriority,
  uniqueInOrder,
  uniqueSorted
} from "../RegionTypes.js";

export default class StructureTreeBuilder {

  build(branchRegions, cycleRegions, complexRegions = [], context = null) {
    const branches = this.filterProtectedRegionOwnedBranches(branchRegions, cycleRegions, complexRegions, context)
      .map((branch, index) => ({
        ...branch,
        id: branch.id || `branch-${index}`,
        children: []
      }));

    this.attachNestedBranches(branches);
    this.attachRegionsToSmallestOverlappingBranch([...cycleRegions, ...complexRegions], branches);

    const topLevelBranches = branches.filter((branch) => !this.findSmallestContainingBranch(branch, branches));

    for (const branch of topLevelBranches) {
      this.expandBranchNodeIdsFromChildren(branch);
    }

    return topLevelBranches;
  }

  attachNestedBranches(branches) {
    for (const branch of branches) {
      const parent = this.findSmallestContainingBranch(branch, branches);

      if (parent) {
        parent.children.push(branch);
      }
    }
  }

  attachRegionsToSmallestOverlappingBranch(regions, branches) {
    for (const region of regions) {
      const parent = this.findSmallestOverlappingBranch(region, branches);

      if (parent) {
        parent.children.push(region);
      }
    }
  }

  filterProtectedRegionOwnedBranches(branchRegions, cycleRegions, complexRegions, context) {
    const protectedRegions = [
      ...(cycleRegions || []),
      ...(complexRegions || [])
    ];

    return branchRegions
      .map((branch) => this.preserveProtectedRegionExitSplit(branch, protectedRegions, context))
      .filter(Boolean);
  }

  preserveProtectedRegionExitSplit(branch, protectedRegions, context) {
    const owningRegion = this.findSmallestOwningProtectedRegion(branch.entryNodeId, protectedRegions);

    if (!owningRegion) {
      return branch;
    }

    const externalPathStartNodeIds = this.collectExternalPathStartNodeIds(branch, owningRegion, context);

    if (externalPathStartNodeIds.length < 2) {
      return null;
    }

    const externalPathStartNodeIdSet = new Set(externalPathStartNodeIds);
    const filteredJoinNodeIds = (branch.joinNodeIds || [])
      .filter((nodeId) => !externalPathStartNodeIdSet.has(nodeId) || nodeId === branch.exitNodeId);
    const filteredParentJoinNodeIds = (branch.parentJoinNodeIds || [])
      .filter((nodeId) => !externalPathStartNodeIdSet.has(nodeId) || nodeId === branch.exitNodeId);

    return {
      ...branch,
      protectedRegionExitSplit: true,
      protectedRegionType: owningRegion.type,
      protectedRegionId: owningRegion.id,
      cycleExitSplit: owningRegion.type === "cycle",
      pathStartNodeIds: externalPathStartNodeIds,
      joinNodeIds: filteredJoinNodeIds,
      parentJoinNodeIds: filteredParentJoinNodeIds
    };
  }

  collectExternalPathStartNodeIds(branch, protectedRegion, context) {
    const protectedNodeIds = new Set(protectedRegion.nodeIds || []);
    const outgoingByNodeId = context?.analysis?.outgoingByNodeId;

    if (!outgoingByNodeId) {
      return uniqueInOrder((branch.pathStartNodeIds || [])
        .filter((nodeId) => !protectedNodeIds.has(nodeId)));
    }

    return uniqueInOrder((branch.pathStartNodeIds || [])
      .flatMap((nodeId) => this.firstExternalNodeIdsFromProtectedPath(
        nodeId,
        branch.entryNodeId,
        protectedNodeIds,
        outgoingByNodeId
      )));
  }

  firstExternalNodeIdsFromProtectedPath(startNodeId, entryNodeId, protectedNodeIds, outgoingByNodeId) {
    if (!protectedNodeIds.has(startNodeId)) {
      return [startNodeId];
    }

    if (startNodeId === entryNodeId) {
      return [];
    }

    const externalNodeIds = [];
    const queue = [startNodeId];
    const visitedNodeIds = new Set();

    while (queue.length > 0) {
      const nodeId = queue.shift();

      if (!nodeId || visitedNodeIds.has(nodeId) || nodeId === entryNodeId) {
        continue;
      }

      visitedNodeIds.add(nodeId);

      for (const edge of outgoingByNodeId.get(nodeId) || []) {
        if (!protectedNodeIds.has(edge.target)) {
          externalNodeIds.push(edge.target);
          continue;
        }

        if (edge.target !== entryNodeId && !visitedNodeIds.has(edge.target)) {
          queue.push(edge.target);
        }
      }
    }

    return externalNodeIds;
  }

  findSmallestOwningProtectedRegion(nodeId, protectedRegions) {
    return (protectedRegions || [])
      .filter((region) => isOpaqueRegionType(region.type))
      .filter((region) => (region.nodeIds || []).includes(nodeId))
      .sort((first, second) =>
        (first.nodeIds || []).length - (second.nodeIds || []).length ||
        opaqueRegionPriority(first.type) - opaqueRegionPriority(second.type)
      )[0] || null;
  }

  findSmallestContainingBranch(region, branches) {
    return branches
      .filter((branch) =>
        branch !== region &&
        this.isProperSubset(region.nodeIds, branch.nodeIds)
      )
      .sort((first, second) => first.nodeIds.length - second.nodeIds.length)[0] || null;
  }

  findSmallestOverlappingBranch(region, branches) {
    return branches
      .filter((branch) => this.regionsOverlap(branch, region))
      .sort((first, second) => first.nodeIds.length - second.nodeIds.length)[0] || null;
  }

  regionsOverlap(first, second) {
    const firstNodeIds = new Set(first.nodeIds || []);

    return (second.nodeIds || []).some((nodeId) => firstNodeIds.has(nodeId));
  }

  isProperSubset(nodeIds, candidateParentNodeIds) {
    if (!nodeIds || !candidateParentNodeIds || nodeIds.length >= candidateParentNodeIds.length) {
      return false;
    }

    const candidateParentNodeIdSet = new Set(candidateParentNodeIds);

    return nodeIds.every((nodeId) => candidateParentNodeIdSet.has(nodeId));
  }

  expandBranchNodeIdsFromChildren(branch) {
    for (const child of branch.children || []) {
      if (child.type === "branch") {
        this.expandBranchNodeIdsFromChildren(child);
      }

      branch.nodeIds = uniqueSorted([
        ...(branch.nodeIds || []),
        ...(child.nodeIds || [])
      ]);
    }
  }
}

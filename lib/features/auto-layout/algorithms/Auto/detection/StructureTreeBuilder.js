export default class StructureTreeBuilder {

  build(branchRegions, cycleRegions) {
    const branches = this.filterCycleOwnedBranches(branchRegions, cycleRegions)
      .map((branch, index) => ({
        ...branch,
        id: branch.id || `branch-${index}`,
        children: []
      }));

    for (const branch of branches) {
      const parent = this.findSmallestContainingBranch(branch, branches);

      if (parent) {
        parent.children.push(branch);
      }
    }

    for (const cycle of cycleRegions) {
      const parent = this.findSmallestOverlappingBranch(cycle, branches);

      if (parent) {
        parent.children.push(cycle);
      }
    }

    return branches.filter((branch) => !this.findSmallestContainingBranch(branch, branches));
  }

  filterCycleOwnedBranches(branchRegions, cycleRegions) {
    const cycleNodeIds = new Set(cycleRegions.flatMap((cycle) => cycle.nodeIds || []));

    return branchRegions.filter((branch) => !cycleNodeIds.has(branch.entryNodeId));
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
}

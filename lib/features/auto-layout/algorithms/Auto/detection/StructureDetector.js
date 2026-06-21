export default class StructureDetector {

  static $inject = [
    "autoGraphAnalysis",
    "autoCycleDetector",
    "autoComplexDetector",
    "autoBranchDetector",
    "autoStructureTreeBuilder",
    "autoStructureSequenceFiller",
    "autoStructurePostProcessor"
  ];

  constructor(
    autoGraphAnalysis,
    autoCycleDetector,
    autoComplexDetector,
    autoBranchDetector,
    autoStructureTreeBuilder,
    autoStructureSequenceFiller,
    autoStructurePostProcessor
  ) {
    this.autoGraphAnalysis = autoGraphAnalysis;
    this.autoCycleDetector = autoCycleDetector;
    this.autoComplexDetector = autoComplexDetector;
    this.autoBranchDetector = autoBranchDetector;
    this.autoStructureTreeBuilder = autoStructureTreeBuilder;
    this.autoStructureSequenceFiller = autoStructureSequenceFiller;
    this.autoStructurePostProcessor = autoStructurePostProcessor;
  }

  detect(petriNet) {
    const analysis = this.autoGraphAnalysis.analyze(petriNet);
    const context = this.createContext(analysis);
    const cycleRegions = this.autoCycleDetector.detect(context);
    const complexRegions = this.autoComplexDetector.detect(context, cycleRegions);
    const complexCoveredCycleIds = new Set(complexRegions.flatMap((region) => region.coveredCycleIds || []));
    const protectedCycleRegions = cycleRegions.filter((cycle) => !complexCoveredCycleIds.has(cycle.id));
    const branchRegions = this.autoBranchDetector.detect(context);
    const branchTree = this.autoStructureTreeBuilder.build(branchRegions, protectedCycleRegions, complexRegions, context);
    this.autoStructurePostProcessor.normalizeBranchJoinOwnership(branchTree, context);
    this.autoStructurePostProcessor.attachBoundaryNodesToAdjacentBranches(branchTree, context);
    for (const branch of branchTree) {
      this.autoStructureTreeBuilder.expandBranchNodeIdsFromChildren(branch);
    }
    const topLevelBranches = this.autoStructureSequenceFiller.fillBranches(
      branchTree,
      context
    );
    const nestedCycleIds = new Set(this.collectRegions(topLevelBranches, "cycle").map((cycle) => cycle.id));
    const nestedComplexIds = new Set(this.collectRegions(topLevelBranches, "complex").map((region) => region.id));
    const topLevelCycles = this.autoStructurePostProcessor.mergeOverlappingRegions(
      protectedCycleRegions.filter((cycle) => !nestedCycleIds.has(cycle.id)),
      context
    );
    const topLevelComplexRegions = complexRegions.filter((region) => !nestedComplexIds.has(region.id));
    const assignedNodeIds = new Set([
      ...topLevelBranches.flatMap((region) => region.nodeIds),
      ...topLevelCycles.flatMap((region) => region.nodeIds),
      ...topLevelComplexRegions.flatMap((region) => region.nodeIds)
    ]);
    const sequenceRegions = this.autoStructureSequenceFiller.detectTopLevelSequences(context, assignedNodeIds);
    const regions = [...topLevelBranches, ...topLevelCycles, ...topLevelComplexRegions, ...sequenceRegions];

    this.autoStructurePostProcessor.attachBoundaryNodesToAdjacentRegions(regions, context);

    const regionNodeIds = new Set(regions.flatMap((region) => region.nodeIds || []));
    const otherNodeIds = analysis.nodes
      .map((node) => node.id)
      .filter((nodeId) => !regionNodeIds.has(nodeId));

    if (otherNodeIds.length > 0) {
      regions.push({
        type: regions.length === 0 ? "sequence" : "other",
        algorithm: "sugiyama",
        nodeIds: otherNodeIds,
        edgeIds: context.edgeIdsInside(otherNodeIds)
      });
    }

    return {
      type: "graph",
      regions,
      analysis
    };
  }

  collectRegions(regions, type) {
    return regions.flatMap((region) => [
      ...(region.type === type ? [region] : []),
      ...this.collectRegions(region.children || [], type)
    ]);
  }

  createContext(analysis) {
    return {
      analysis,
      edgeIdsInside: (nodeIds) => {
        const nodeIdSet = new Set(nodeIds);

        return analysis.edges
          .filter((edge) => nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target))
          .map((edge) => edge.id);
      }
    };
  }
}

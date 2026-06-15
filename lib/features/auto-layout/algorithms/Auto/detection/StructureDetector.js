export default class StructureDetector {

  static $inject = [
    "autoGraphAnalysis",
    "autoCycleDetector",
    "autoBranchDetector",
    "autoStructureTreeBuilder",
    "autoStructureSequenceFiller",
    "autoStructurePostProcessor"
  ];

  constructor(
    autoGraphAnalysis,
    autoCycleDetector,
    autoBranchDetector,
    autoStructureTreeBuilder,
    autoStructureSequenceFiller,
    autoStructurePostProcessor
  ) {
    this.autoGraphAnalysis = autoGraphAnalysis;
    this.autoCycleDetector = autoCycleDetector;
    this.autoBranchDetector = autoBranchDetector;
    this.autoStructureTreeBuilder = autoStructureTreeBuilder;
    this.autoStructureSequenceFiller = autoStructureSequenceFiller;
    this.autoStructurePostProcessor = autoStructurePostProcessor;
  }

  detect(petriNet) {
    const analysis = this.autoGraphAnalysis.analyze(petriNet);
    const context = this.createContext(analysis);
    const cycleRegions = this.autoCycleDetector.detect(context);
    const branchRegions = this.autoBranchDetector.detect(context);
    const branchTree = this.autoStructureTreeBuilder.build(branchRegions, cycleRegions);
    this.autoStructurePostProcessor.normalizeBranchJoinOwnership(branchTree, context);
    const topLevelBranches = this.autoStructureSequenceFiller.fillBranches(
      branchTree,
      context
    );
    const nestedCycleIds = new Set(this.collectRegions(topLevelBranches, "cycle").map((cycle) => cycle.id));
    const topLevelCycles = this.autoStructurePostProcessor.mergeOverlappingRegions(
      cycleRegions.filter((cycle) => !nestedCycleIds.has(cycle.id)),
      context
    );
    const assignedNodeIds = new Set([
      ...topLevelBranches.flatMap((region) => region.nodeIds),
      ...topLevelCycles.flatMap((region) => region.nodeIds)
    ]);
    const sequenceRegions = this.autoStructureSequenceFiller.detectTopLevelSequences(context, assignedNodeIds);
    const regions = [...topLevelBranches, ...topLevelCycles, ...sequenceRegions];

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

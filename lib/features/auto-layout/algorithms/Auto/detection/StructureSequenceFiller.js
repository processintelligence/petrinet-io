export default class StructureSequenceFiller {

  static $inject = ["autoSequenceDetector"];

  constructor(autoSequenceDetector) {
    this.autoSequenceDetector = autoSequenceDetector;
  }

  fillBranches(branchRegions, context) {
    return branchRegions.map((branch) => this.fillBranch(branch, context));
  }

  fillBranch(branch, context) {
    const children = (branch.children || []).map((child) =>
      child.type === "branch" ? this.fillBranch(child, context) : child
    );
    const childNodeIds = new Set(children.flatMap((child) => child.nodeIds || []));
    const sequenceRegions = this.autoSequenceDetector.detect({
      ...context,
      allowedNodeIds: new Set(branch.nodeIds || []),
      reservedNodeIds: childNodeIds,
      includeSingleNodeSequences: true
    });

    return {
      ...branch,
      children: [...children, ...sequenceRegions]
    };
  }

  detectTopLevelSequences(context, assignedNodeIds) {
    return this.autoSequenceDetector.detect({
      ...context,
      reservedNodeIds: assignedNodeIds
    });
  }
}

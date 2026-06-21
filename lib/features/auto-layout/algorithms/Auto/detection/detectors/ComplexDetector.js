import { compareNodeIds } from "../../RegionTypes.js";

export default class ComplexDetector {

  detect(context, cycleRegions = []) {
    return (context.analysis.strongComponents || [])
      .map((component) => this.buildComplexRegion(component, context, cycleRegions))
      .filter(Boolean);
  }

  buildComplexRegion(component, context, cycleRegions) {
    if (!component.nodeIds || component.nodeIds.length < 3) {
      return null;
    }

    const componentNodeIds = new Set(component.nodeIds || []);
    const containedCycles = cycleRegions.filter((cycle) =>
      (cycle.nodeIds || []).every((nodeId) => componentNodeIds.has(nodeId))
    );

    if (containedCycles.some((cycle) => this.sameNodeIds(cycle.nodeIds, component.nodeIds)) &&
      this.isSimpleDirectedRing(component, context)) {
      return null;
    }

    const containedCycleNodeIds = new Set(containedCycles.flatMap((cycle) => cycle.nodeIds || []));

    if (this.sameNodeIds([...containedCycleNodeIds], component.nodeIds) &&
      this.isSingleSplitJoinCycleComponent(component, context)) {
      return null;
    }

    let nodeIds = (component.nodeIds || [])
      .filter((nodeId) => !containedCycleNodeIds.has(nodeId))
      .sort(compareNodeIds);
    const coveredCycleIds = [];

    if (nodeIds.length < 3) {
      nodeIds = [...componentNodeIds].sort(compareNodeIds);
      coveredCycleIds.push(...containedCycles.map((cycle) => cycle.id));
    }

    return {
      id: `${component.id}.complex`,
      type: "complex",
      algorithm: "sugiyama",
      nodeIds,
      coveredCycleIds,
      edgeIds: context.edgeIdsInside(nodeIds)
    };
  }

  sameNodeIds(firstNodeIds = [], secondNodeIds = []) {
    if (firstNodeIds.length !== secondNodeIds.length) {
      return false;
    }

    const secondNodeIdSet = new Set(secondNodeIds);

    return firstNodeIds.every((nodeId) => secondNodeIdSet.has(nodeId));
  }

  isSimpleDirectedRing(component, context) {
    const nodeIdSet = new Set(component.nodeIds || []);

    for (const nodeId of component.nodeIds || []) {
      const internalIncomingCount = (context.analysis.incomingByNodeId.get(nodeId) || [])
        .filter((edge) => nodeIdSet.has(edge.source))
        .length;
      const internalOutgoingCount = (context.analysis.outgoingByNodeId.get(nodeId) || [])
        .filter((edge) => nodeIdSet.has(edge.target))
        .length;

      if (internalIncomingCount !== 1 || internalOutgoingCount !== 1) {
        return false;
      }
    }

    return true;
  }

  isSingleSplitJoinCycleComponent(component, context) {
    const nodeIdSet = new Set(component.nodeIds || []);
    const splitNodeIds = [];
    const joinNodeIds = [];

    for (const nodeId of component.nodeIds || []) {
      const internalIncomingCount = (context.analysis.incomingByNodeId.get(nodeId) || [])
        .filter((edge) => nodeIdSet.has(edge.source))
        .length;
      const internalOutgoingCount = (context.analysis.outgoingByNodeId.get(nodeId) || [])
        .filter((edge) => nodeIdSet.has(edge.target))
        .length;

      if (internalIncomingCount < 1 || internalOutgoingCount < 1) {
        return false;
      }

      if (internalIncomingCount > 1) {
        joinNodeIds.push(nodeId);
      }

      if (internalOutgoingCount > 1) {
        splitNodeIds.push(nodeId);
      }

      if (internalIncomingCount > 1 && internalOutgoingCount > 1) {
        return false;
      }
    }

    return splitNodeIds.length === 1 &&
      joinNodeIds.length === 1 &&
      splitNodeIds[0] !== joinNodeIds[0];
  }
}

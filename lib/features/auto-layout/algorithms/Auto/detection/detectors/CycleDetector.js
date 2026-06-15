export default class CycleDetector {

  detect(context) {
    return context.analysis.strongComponents
      .flatMap((component) => this.detectComponentCycles(component, context));
  }

  detectComponentCycles(component, context) {
    if (this.isSimplePlaceTransitionLoop(component, context)) {
      return [];
    }

    if (this.isCycleComponent(component, context)) {
      return [
        this.buildCycleRegion(component.id, component.nodeIds, context)
      ];
    }

    return this.findSimpleDirectedCycles(component, context)
      .map((nodeIds, index) =>
        this.buildCycleRegion(`${component.id}.${index}`, nodeIds, context)
      );
  }

  buildCycleRegion(id, nodeIds, context) {
    return {
      id,
      type: "cycle",
      algorithm: "circular",
      nodeIds,
      edgeIds: context.edgeIdsInside(nodeIds)
    };
  }

  isCycleComponent(component, context) {
    if (this.isSimplePlaceTransitionLoop(component, context)) {
      return false;
    }

    return component.nodeIds.length > 2 &&
      this.isSimpleDirectedRing(component, context);
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

  findSimpleDirectedCycles(component, context) {
    const componentNodeIds = [...(component.nodeIds || [])]
      .sort((first, second) => String(first).localeCompare(String(second)));
    const componentNodeIdSet = new Set(componentNodeIds);
    const cycles = [];
    const cycleKeys = new Set();

    for (const startNodeId of componentNodeIds) {
      this.walkSimpleCycles(
        startNodeId,
        startNodeId,
        componentNodeIdSet,
        context,
        [startNodeId],
        new Set([startNodeId]),
        cycles,
        cycleKeys
      );
    }

    return cycles;
  }

  walkSimpleCycles(startNodeId, currentNodeId, componentNodeIdSet, context, path, visitedNodeIds, cycles, cycleKeys) {
    for (const nextNodeId of context.analysis.directedAdjacency.get(currentNodeId) || []) {
      if (!componentNodeIdSet.has(nextNodeId)) {
        continue;
      }

      if (nextNodeId === startNodeId) {
        if (path.length <= 2) {
          continue;
        }

        const cycleNodeIds = [...path].sort((first, second) => String(first).localeCompare(String(second)));
        const cycleKey = cycleNodeIds.join("|");

        if (!cycleKeys.has(cycleKey)) {
          cycleKeys.add(cycleKey);
          cycles.push(cycleNodeIds);
        }

        continue;
      }

      if (visitedNodeIds.has(nextNodeId)) {
        continue;
      }

      if (String(nextNodeId).localeCompare(String(startNodeId)) < 0) {
        continue;
      }

      visitedNodeIds.add(nextNodeId);
      path.push(nextNodeId);
      this.walkSimpleCycles(
        startNodeId,
        nextNodeId,
        componentNodeIdSet,
        context,
        path,
        visitedNodeIds,
        cycles,
        cycleKeys
      );
      path.pop();
      visitedNodeIds.delete(nextNodeId);
    }
  }

  isSimplePlaceTransitionLoop(component, context) {
    if (component.nodeIds.length !== 2) {
      return false;
    }

    const nodes = component.nodeIds
      .map((nodeId) => context.analysis.nodeById.get(nodeId))
      .filter(Boolean);

    return nodes.some((node) => node.type === "place") &&
      nodes.some((node) => node.type === "transition");
  }
}

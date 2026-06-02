export default class CycleDetector {

  detect(context) {
    return context.analysis.strongComponents
      .filter((component) => this.isCycleComponent(component, context))
      .map((component) => ({
        id: component.id,
        type: "cycle",
        algorithm: "circular",
        nodeIds: component.nodeIds,
        edgeIds: context.edgeIdsInside(component.nodeIds)
      }));
  }

  isCycleComponent(component, context) {
    if (this.isSimplePlaceTransitionLoop(component, context)) {
      return false;
    }

    return component.nodeIds.length > 2;
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

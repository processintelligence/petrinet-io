export default class StructureHighlighter {

  static $inject = ["elementRegistry", "eventBus"];

  constructor(elementRegistry, eventBus) {
    this.elementRegistry = elementRegistry;
    this.eventBus = eventBus;
  }

  highlight(detection) {
    const colorByNodeId = this.buildColorByNodeId(detection);
    const changedElements = [];

    for (const element of this.elementRegistry.getAll()) {
      if (element.type !== "petri:place" &&
        element.type !== "petri:transition" &&
        element.type !== "petri:empty_transition") {
        continue;
      }

      const color = colorByNodeId.get(element.id);

      if (color) {
        element.autoLayoutDebugColor = color;
        delete element.autoLayoutDebugLabel;
        changedElements.push(element);
      } else if (element.autoLayoutDebugColor || element.autoLayoutDebugLabel) {
        delete element.autoLayoutDebugColor;
        delete element.autoLayoutDebugLabel;
        changedElements.push(element);
      }
    }

    if (changedElements.length > 0) {
      this.eventBus.fire("elements.changed", { elements: changedElements });
    }
  }

  buildColorByNodeId(detection) {
    const colorByNodeId = new Map();
    const regions = this.collectRegionsPostOrder(detection?.regions || [])
      .filter((region) => region.type !== "other");

    for (const region of regions) {
      const color = this.colorForRegionType(region.type);

      for (const nodeId of this.nodeIdsForRegion(region)) {
        if (!colorByNodeId.has(nodeId)) {
          colorByNodeId.set(nodeId, color);
        }
      }
    }

    return colorByNodeId;
  }

  collectRegionsPostOrder(regions) {
    return regions.flatMap((region) => [
      ...this.collectRegionsPostOrder(region.children || []),
      region
    ]);
  }

  nodeIdsForRegion(region) {
    return [...new Set([
      ...(region.nodeIds || []),
      region.entryNodeId,
      region.exitNodeId,
      ...(region.joinNodeIds || []),
      ...(region.pathStartNodeIds || []),
      ...(region.absorbedBoundaryNodeIds || [])
    ].filter((nodeId) => nodeId))];
  }

  colorForRegionType(type) {
    const colorByType = {
      cycle: "#9ee493",
      branch: "#8ec5ff",
      sequence: "#ff9c9c",
      complex: "#d6a3ff"
    };

    return colorByType[type] || "#ffffff";
  }
}

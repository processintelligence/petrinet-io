export default class StructureHighlighter {

  static $inject = ["elementRegistry", "eventBus"];

  constructor(elementRegistry, eventBus) {
    this.elementRegistry = elementRegistry;
    this.eventBus = eventBus;
  }

  highlight(detection) {
    //TODO remove temporary visual debug helper for auto-layout cycle detection.
    const colorByNodeId = this.buildColorByNodeId(detection);
    const labelByNodeId = this.buildLabelByNodeId(detection);
    const changedElements = [];

    for (const element of this.elementRegistry.getAll()) {
      if (element.type !== "petri:place" &&
        element.type !== "petri:transition" &&
        element.type !== "petri:empty_transition") {
        continue;
      }

      element.autoLayoutDebugColor = colorByNodeId.get(element.id) || "#ffffff";
      element.autoLayoutDebugLabel = labelByNodeId.get(element.id) || "";
      changedElements.push(element);
    }

    if (changedElements.length > 0) {
      this.eventBus.fire("elements.changed", { elements: changedElements });
    }
  }

  buildColorByNodeId(detection) {
    const colorByType = {
      cycle: "#9ee493",
      branch: "#8ec5ff",
      sequence: "#ff9c9c",
      other: "#ffffff"
    };
    const typesByNodeId = new Map();
    const colorByNodeId = new Map();

    for (const region of detection.regions || []) {
      this.collectTypes(region, typesByNodeId);
    }

    for (const [nodeId, types] of typesByNodeId) {
      colorByNodeId.set(nodeId, colorByType[this.primaryType(types)] || colorByType.other);
    }

    return colorByNodeId;
  }

  buildLabelByNodeId(detection) {
    const labelIdsByNodeId = new Map();
    const regionIds = new Map();
    let nextRegionId = 1;

    for (const region of this.collectRegionsPostOrder(detection.regions || [])) {
      regionIds.set(region, nextRegionId);
      nextRegionId += 1;
    }

    for (const [region, regionId] of regionIds) {
      for (const nodeId of region.nodeIds || []) {
        if (!labelIdsByNodeId.has(nodeId)) {
          labelIdsByNodeId.set(nodeId, []);
        }

        labelIdsByNodeId.get(nodeId).push(regionId);
      }
    }

    return new Map([...labelIdsByNodeId].map(([nodeId, labelIds]) => [
      nodeId,
      labelIds.sort((first, second) => second - first).join("+")
    ]));
  }

  collectRegionsPostOrder(regions) {
    return regions.flatMap((region) => [
      ...this.collectRegionsPostOrder(region.children || []),
      ...(region.type === "other" ? [] : [region])
    ]);
  }

  collectTypes(region, typesByNodeId) {
    if (region.type === "other") {
      return;
    }

    for (const nodeId of this.nodeIdsForDebugType(region)) {
      if (!typesByNodeId.has(nodeId)) {
        typesByNodeId.set(nodeId, new Set());
      }

      typesByNodeId.get(nodeId).add(region.type);
    }

    for (const child of region.children || []) {
      this.collectTypes(child, typesByNodeId);
    }
  }

  nodeIdsForDebugType(region) {
    if (region.type !== "branch") {
      return region.nodeIds || [];
    }

    return [region.entryNodeId, region.exitNodeId]
      .filter((nodeId) => nodeId);
  }

  primaryType(types) {
    const priority = ["cycle", "sequence", "branch"];

    return priority.find((type) => types.has(type)) || "other";
  }
}

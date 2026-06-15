export default class ModularLayout {

  static $inject = [
    "sugiyamaLayoutAlgorithm",
    "autoCycleRegionLayout",
    "autoBranchRegionLayout",
    "autoBlockLayoutComposer",
    "autoLayoutGeometry",
    "autoLayoutGraph"
  ];

  constructor(
    sugiyamaLayoutAlgorithm,
    autoCycleRegionLayout,
    autoBranchRegionLayout,
    autoBlockLayoutComposer,
    autoLayoutGeometry,
    autoLayoutGraph
  ) {
    this.sugiyamaLayoutAlgorithm = sugiyamaLayoutAlgorithm;
    this.cycleRegionLayout = autoCycleRegionLayout;
    this.branchRegionLayout = autoBranchRegionLayout;
    this.blockLayoutComposer = autoBlockLayoutComposer;
    this.geometry = autoLayoutGeometry;
    this.graph = autoLayoutGraph;
  }

  layout(petriNet, detection) {
    const topLevelLayouts = [];
    const usedNodeIds = new Set();
    const allNodeIds = (petriNet.nodes || []).map((node) => node.id);

    for (const region of detection.regions || []) {
      const availableNodeIds = new Set(
        allNodeIds.filter((nodeId) => !usedNodeIds.has(nodeId))
      );
      const layout = this.layoutRegion(petriNet, region, availableNodeIds);

      if (!layout || layout.nodeIds.length === 0) {
        continue;
      }

      topLevelLayouts.push(layout);

      for (const nodeId of layout.nodeIds) {
        usedNodeIds.add(nodeId);
      }
    }

    const remainingNodeIds = allNodeIds
      .filter((nodeId) => !usedNodeIds.has(nodeId));

    if (remainingNodeIds.length > 0) {
      topLevelLayouts.push(this.layoutLeafRegion(
        petriNet,
        {
          id: "auto-remaining",
          type: "other",
          algorithm: "sugiyama",
          nodeIds: remainingNodeIds
        },
        new Set(remainingNodeIds)
      ));
    }

    if (topLevelLayouts.length === 0) {
      return this.sugiyamaLayoutAlgorithm.layout(this.clonePetriNet(petriNet));
    }

    const composed = this.blockLayoutComposer.compose(petriNet, topLevelLayouts, {
      id: "auto-root",
      type: "graph",
      algorithm: "sugiyama"
    });

    return {
      ...petriNet,
      nodes: composed.nodes,
      edges: (petriNet.edges || []).map((edge) => ({ ...edge }))
    };
  }

  layoutRegion(petriNet, region, allowedNodeIds = null) {
    const regionNodeIds = this.expandRegionNodeIds(petriNet, region, allowedNodeIds);
    const children = (region.children || [])
      .map((child) => this.layoutRegion(petriNet, child, regionNodeIds))
      .filter(Boolean);

    if (children.length === 0) {
      return this.layoutLeafRegion(petriNet, region, regionNodeIds);
    }

    return this.layoutCompositeRegion(petriNet, region, regionNodeIds, children);
  }

  layoutLeafRegion(petriNet, region, nodeIds) {
    if (region.type === "cycle") {
      return this.cycleRegionLayout.layout(petriNet, region, nodeIds);
    }

    const subgraph = this.graph.buildSubgraph(petriNet, nodeIds);

    if (subgraph.nodes.length === 0) {
      return null;
    }

    const laidOutPN = this.sugiyamaLayoutAlgorithm.layout(subgraph);
    const normalizedNodes = this.geometry.normalizeNodes(
      laidOutPN.nodes.filter((node) => nodeIds.has(node.id))
    );

    return this.geometry.buildLayout(region, normalizedNodes.nodes, nodeIds, normalizedNodes.bounds);
  }

  layoutCompositeRegion(petriNet, region, regionNodeIds, children) {
    const childLayouts = this.selectDisjointLayouts(children);
    const childNodeIds = new Set(childLayouts.flatMap((child) => child.nodeIds));
    const rawNodeLayouts = [...regionNodeIds]
      .filter((nodeId) => !childNodeIds.has(nodeId))
      .map((nodeId) => this.layoutRawNode(petriNet, nodeId))
      .filter(Boolean);
    const layouts = [...childLayouts, ...rawNodeLayouts];

    if (region.type === "branch") {
      return this.branchRegionLayout.layout(petriNet, region, regionNodeIds, layouts);
    }

    return this.blockLayoutComposer.compose(petriNet, layouts, region, regionNodeIds);
  }

  layoutRawNode(petriNet, nodeId) {
    const node = (petriNet.nodes || []).find((candidate) => candidate.id === nodeId);

    if (!node) {
      return null;
    }

    return this.geometry.buildLayout(
      { id: node.id, type: "node", algorithm: "fixed" },
      [{ ...node, x: this.geometry.padding, y: this.geometry.padding }],
      new Set([node.id]),
      {
        width: Math.max(this.geometry.minimumBlockSize, (node.width || 0) + this.geometry.padding * 2),
        height: Math.max(this.geometry.minimumBlockSize, (node.height || 0) + this.geometry.padding * 2)
      }
    );
  }

  expandRegionNodeIds(petriNet, region, allowedNodeIds) {
    const baseNodeIds = new Set(
      (region.nodeIds || []).filter((nodeId) => !allowedNodeIds || allowedNodeIds.has(nodeId))
    );

    if (region.type !== "cycle") {
      return baseNodeIds;
    }

    return this.cycleRegionLayout.expandNodeIds(petriNet, baseNodeIds, allowedNodeIds);
  }

  selectDisjointLayouts(layouts) {
    const usedNodeIds = new Set();
    const selectedLayouts = [];

    for (const layout of layouts) {
      if (layout.nodeIds.some((nodeId) => usedNodeIds.has(nodeId))) {
        continue;
      }

      selectedLayouts.push(layout);

      for (const nodeId of layout.nodeIds) {
        usedNodeIds.add(nodeId);
      }
    }

    return selectedLayouts;
  }

  clonePetriNet(petriNet) {
    return {
      ...petriNet,
      nodes: (petriNet.nodes || []).map((node) => ({ ...node })),
      edges: (petriNet.edges || []).map((edge) => ({ ...edge }))
    };
  }
}

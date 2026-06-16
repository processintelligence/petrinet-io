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

    return this.layoutCompositeRegion(petriNet, region, regionNodeIds, children, allowedNodeIds);
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

  layoutCompositeRegion(petriNet, region, regionNodeIds, children, allowedNodeIds = null) {
    const childLayouts = this.selectDisjointLayouts(children);

    if (region.type === "branch") {
      if (!this.canUseBranchSkeletonLayout(petriNet, region, regionNodeIds)) {
        const fallbackNodeIds = this.expandFallbackNodeIds(petriNet, regionNodeIds, allowedNodeIds);

        return this.layoutSugiyamaGroup(petriNet, {
          ...region,
          type: "other",
          algorithm: "sugiyama"
        }, fallbackNodeIds);
      }

      const layouts = this.prepareBranchLayouts(petriNet, region, regionNodeIds, childLayouts);

      return this.branchRegionLayout.layout(petriNet, region, regionNodeIds, layouts);
    }

    const childNodeIds = new Set(childLayouts.flatMap((child) => child.nodeIds));
    const rawNodeLayouts = [...regionNodeIds]
      .filter((nodeId) => !childNodeIds.has(nodeId))
      .map((nodeId) => this.layoutRawNode(petriNet, nodeId))
      .filter(Boolean);
    const layouts = [...childLayouts, ...rawNodeLayouts];

    return this.blockLayoutComposer.compose(petriNet, layouts, region, regionNodeIds);
  }

  canUseBranchSkeletonLayout(petriNet, region, regionNodeIds) {
    if (!region.entryNodeId || !Array.isArray(region.pathStartNodeIds) || region.pathStartNodeIds.length < 2) {
      return false;
    }

    return !this.hasReenteredPathStart(petriNet, region, regionNodeIds);
  }

  hasReenteredPathStart(petriNet, region, regionNodeIds) {
    const regionNodeIdSet = regionNodeIds instanceof Set ? regionNodeIds : new Set(regionNodeIds);
    const pathStartNodeIds = new Set(region.pathStartNodeIds || []);

    return (petriNet.edges || []).some((edge) =>
      pathStartNodeIds.has(edge.target) &&
      edge.source !== region.entryNodeId &&
      regionNodeIdSet.has(edge.source) &&
      !this.isCycleInternalEdge(region, edge)
    );
  }

  isCycleInternalEdge(region, edge) {
    return (region.children || [])
      .filter((child) => child.type === "cycle")
      .some((cycle) => {
        const cycleNodeIds = new Set(cycle.nodeIds || []);

        return cycleNodeIds.has(edge.source) && cycleNodeIds.has(edge.target);
      });
  }

  expandFallbackNodeIds(petriNet, regionNodeIds, allowedNodeIds) {
    if (!allowedNodeIds) {
      return regionNodeIds;
    }

    const allowedNodeIdSet = allowedNodeIds instanceof Set ? allowedNodeIds : new Set(allowedNodeIds);
    const fallbackNodeIds = new Set(regionNodeIds);
    const queue = [...regionNodeIds];

    while (queue.length > 0) {
      const nodeId = queue.shift();

      for (const edge of petriNet.edges || []) {
        const nextNodeId = edge.source === nodeId
          ? edge.target
          : edge.target === nodeId
            ? edge.source
            : null;

        if (!nextNodeId || !allowedNodeIdSet.has(nextNodeId) || fallbackNodeIds.has(nextNodeId)) {
          continue;
        }

        fallbackNodeIds.add(nextNodeId);
        queue.push(nextNodeId);
      }
    }

    return fallbackNodeIds;
  }

  prepareBranchLayouts(petriNet, region, regionNodeIds, childLayouts) {
    const structuralNodeIds = this.branchStructuralNodeIds(region);
    const protectedChildLayouts = childLayouts
      .filter((layout) => layout.type === "branch" || layout.type === "cycle");
    const protectedChildNodeIds = new Set(protectedChildLayouts.flatMap((layout) => layout.nodeIds || []));
    const contentNodeIds = [...regionNodeIds]
      .filter((nodeId) => !structuralNodeIds.has(nodeId))
      .filter((nodeId) => !protectedChildNodeIds.has(nodeId));
    const contentLayouts = this.connectedNodeGroups(petriNet, new Set(contentNodeIds))
      .map((nodeIds, index) => this.layoutSugiyamaGroup(petriNet, {
        id: `${region.id || "branch"}-content-${index}`,
        type: "sequence",
        algorithm: "sugiyama",
        nodeIds
      }, new Set(nodeIds)))
      .filter(Boolean);
    const structuralLayouts = [...structuralNodeIds]
      .filter((nodeId) => regionNodeIds.has(nodeId))
      .filter((nodeId) => !protectedChildNodeIds.has(nodeId))
      .map((nodeId) => this.layoutRawNode(petriNet, nodeId))
      .filter(Boolean);

    return [
      ...protectedChildLayouts,
      ...contentLayouts,
      ...structuralLayouts
    ];
  }

  branchStructuralNodeIds(region) {
    return new Set([
      region.entryNodeId,
      ...(region.parentJoinNodeIds || []),
      region.exitNodeId
    ].filter((nodeId) => nodeId));
  }

  connectedNodeGroups(petriNet, nodeIds) {
    const unvisitedNodeIds = new Set(nodeIds);
    const adjacentByNodeId = new Map([...nodeIds].map((nodeId) => [nodeId, []]));

    for (const edge of petriNet.edges || []) {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        continue;
      }

      adjacentByNodeId.get(edge.source).push(edge.target);
      adjacentByNodeId.get(edge.target).push(edge.source);
    }

    const groups = [];

    while (unvisitedNodeIds.size > 0) {
      const startNodeId = [...unvisitedNodeIds][0];
      const group = [];
      const queue = [startNodeId];

      unvisitedNodeIds.delete(startNodeId);

      while (queue.length > 0) {
        const nodeId = queue.shift();

        group.push(nodeId);

        for (const nextNodeId of adjacentByNodeId.get(nodeId) || []) {
          if (!unvisitedNodeIds.has(nextNodeId)) {
            continue;
          }

          unvisitedNodeIds.delete(nextNodeId);
          queue.push(nextNodeId);
        }
      }

      groups.push(group.sort((first, second) => String(first).localeCompare(String(second))));
    }

    return groups.sort((first, second) =>
      String(first[0]).localeCompare(String(second[0]))
    );
  }

  layoutSugiyamaGroup(petriNet, region, nodeIds) {
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

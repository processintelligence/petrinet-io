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
      const layouts = this.prepareBranchLayouts(petriNet, region, regionNodeIds, childLayouts);

      if (!this.canUseBranchSkeletonLayout(petriNet, region, regionNodeIds, layouts)) {
        if (!this.hasOpaqueChildLayout(layouts)) {
          return this.layoutLeafRegion(petriNet, {
            id: region.id,
            type: region.type,
            algorithm: "sugiyama",
            nodeIds: [...regionNodeIds]
          }, regionNodeIds);
        }

        return this.blockLayoutComposer.compose(petriNet, layouts, {
          ...region,
          algorithm: "sugiyama"
        }, regionNodeIds);
      }

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

  canUseBranchSkeletonLayout(petriNet, region, regionNodeIds, layouts = null) {
    if (!region.entryNodeId || !Array.isArray(region.pathStartNodeIds) || region.pathStartNodeIds.length < 2) {
      return false;
    }

    if (this.hasReenteredPathStart(petriNet, region, regionNodeIds)) {
      return false;
    }

    if (this.hasBypassedAllowedJoinSuccessor(petriNet, region, regionNodeIds)) {
      return false;
    }

    if (layouts) {
      return !this.hasCrossLaneMergeBetweenLayouts(petriNet, region, regionNodeIds, layouts);
    }

    return !this.hasCrossLaneMerge(petriNet, region, regionNodeIds);
  }

  hasReenteredPathStart(petriNet, region, regionNodeIds) {
    const regionNodeIdSet = regionNodeIds instanceof Set ? regionNodeIds : new Set(regionNodeIds);
    const pathStartNodeIds = new Set(region.pathStartNodeIds || []);

    return (petriNet.edges || []).some((edge) =>
      pathStartNodeIds.has(edge.target) &&
      edge.source !== region.entryNodeId &&
      regionNodeIdSet.has(edge.source) &&
      !this.isProtectedChildInternalEdge(region, edge)
    );
  }

  isProtectedChildInternalEdge(region, edge) {
    return (region.children || [])
      .filter((child) => this.isProtectedRegionType(child.type))
      .some((child) => {
        const childNodeIds = new Set(child.nodeIds || []);

        return childNodeIds.has(edge.source) && childNodeIds.has(edge.target);
      });
  }

  hasBypassedAllowedJoinSuccessor(petriNet, region, regionNodeIds) {
    const allowedJoinNodeIds = new Set([region.exitNodeId].filter((nodeId) => nodeId));

    if (allowedJoinNodeIds.size === 0) {
      return false;
    }

    const regionNodeIdSet = regionNodeIds instanceof Set ? regionNodeIds : new Set(regionNodeIds);
    const outgoingByNodeId = this.graph.buildOutgoingByNodeId(petriNet);
    const downstreamJoinSuccessorNodeIds = this.collectDownstreamJoinSuccessorNodeIds(
      allowedJoinNodeIds,
      regionNodeIdSet,
      outgoingByNodeId
    );

    if (downstreamJoinSuccessorNodeIds.size === 0) {
      return false;
    }

    for (const pathStartNodeId of region.pathStartNodeIds || []) {
      if (allowedJoinNodeIds.has(pathStartNodeId)) {
        continue;
      }

      const queue = [pathStartNodeId];
      const visitedNodeIds = new Set();

      while (queue.length > 0) {
        const nodeId = queue.shift();

        if (!nodeId || visitedNodeIds.has(nodeId) || !regionNodeIdSet.has(nodeId)) {
          continue;
        }

        if (downstreamJoinSuccessorNodeIds.has(nodeId)) {
          return true;
        }

        visitedNodeIds.add(nodeId);

        if (allowedJoinNodeIds.has(nodeId)) {
          continue;
        }

        for (const edge of outgoingByNodeId.get(nodeId) || []) {
          if (regionNodeIdSet.has(edge.target) && !visitedNodeIds.has(edge.target)) {
            queue.push(edge.target);
          }
        }
      }
    }

    return false;
  }

  collectDownstreamJoinSuccessorNodeIds(allowedJoinNodeIds, regionNodeIds, outgoingByNodeId) {
    const downstreamNodeIds = new Set();
    const queue = [];

    for (const joinNodeId of allowedJoinNodeIds) {
      for (const edge of outgoingByNodeId.get(joinNodeId) || []) {
        if (regionNodeIds.has(edge.target) && !allowedJoinNodeIds.has(edge.target)) {
          queue.push(edge.target);
        }
      }
    }

    while (queue.length > 0) {
      const nodeId = queue.shift();

      if (!nodeId || downstreamNodeIds.has(nodeId) || !regionNodeIds.has(nodeId)) {
        continue;
      }

      downstreamNodeIds.add(nodeId);

      for (const edge of outgoingByNodeId.get(nodeId) || []) {
        if (regionNodeIds.has(edge.target) && !downstreamNodeIds.has(edge.target)) {
          queue.push(edge.target);
        }
      }
    }

    return downstreamNodeIds;
  }

  prepareBranchLayouts(petriNet, region, regionNodeIds, childLayouts) {
    const structuralNodeIds = this.branchStructuralNodeIds(region);
    const protectedChildLayouts = childLayouts
      .filter((layout) => this.isProtectedRegionType(layout.type));
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

  hasCrossLaneMerge(petriNet, region, regionNodeIds) {
    const regionNodeIdSet = regionNodeIds instanceof Set ? regionNodeIds : new Set(regionNodeIds);
    const allowedJoinNodeIds = this.branchAllowedJoinNodeIds(region);
    const reachablePathStartsByNodeId = new Map();
    const outgoingByNodeId = this.graph.buildOutgoingByNodeId(petriNet);

    for (const pathStartNodeId of region.pathStartNodeIds || []) {
      const queue = [pathStartNodeId];
      const visitedNodeIds = new Set();

      while (queue.length > 0) {
        const nodeId = queue.shift();

        if (!nodeId || visitedNodeIds.has(nodeId) || !regionNodeIdSet.has(nodeId)) {
          continue;
        }

        visitedNodeIds.add(nodeId);

        if (!reachablePathStartsByNodeId.has(nodeId)) {
          reachablePathStartsByNodeId.set(nodeId, new Set());
        }

        reachablePathStartsByNodeId.get(nodeId).add(pathStartNodeId);

        if (allowedJoinNodeIds.has(nodeId)) {
          continue;
        }

        for (const edge of outgoingByNodeId.get(nodeId) || []) {
          if (regionNodeIdSet.has(edge.target) && !visitedNodeIds.has(edge.target)) {
            queue.push(edge.target);
          }
        }
      }
    }

    for (const [nodeId, pathStartNodeIds] of reachablePathStartsByNodeId.entries()) {
      if (pathStartNodeIds.size > 1 && !allowedJoinNodeIds.has(nodeId)) {
        return true;
      }
    }

    return false;
  }

  hasCrossLaneMergeBetweenLayouts(petriNet, region, regionNodeIds, layouts) {
    const regionNodeIdSet = regionNodeIds instanceof Set ? regionNodeIds : new Set(regionNodeIds);
    const layoutByNodeId = this.graph.buildLayoutByNodeId(layouts);
    const unitByNodeId = new Map();

    for (const nodeId of regionNodeIdSet) {
      const layout = layoutByNodeId.get(nodeId);

      unitByNodeId.set(nodeId, layout ? layout.id : nodeId);
    }

    const allowedJoinUnits = new Set(
      [...this.branchAllowedJoinNodeIds(region)]
        .map((nodeId) => unitByNodeId.get(nodeId))
        .filter((unitId) => unitId)
    );
    const outgoingUnitIdsByUnitId = new Map([...unitByNodeId.values()].map((unitId) => [unitId, new Set()]));

    for (const edge of petriNet.edges || []) {
      if (!regionNodeIdSet.has(edge.source) || !regionNodeIdSet.has(edge.target)) {
        continue;
      }

      const sourceUnitId = unitByNodeId.get(edge.source);
      const targetUnitId = unitByNodeId.get(edge.target);

      if (!sourceUnitId || !targetUnitId || sourceUnitId === targetUnitId) {
        continue;
      }

      outgoingUnitIdsByUnitId.get(sourceUnitId).add(targetUnitId);
    }

    const reachablePathStartsByUnitId = new Map();

    for (const pathStartNodeId of region.pathStartNodeIds || []) {
      const startUnitId = unitByNodeId.get(pathStartNodeId);

      if (!startUnitId) {
        continue;
      }

      const queue = [startUnitId];
      const visitedUnitIds = new Set();

      while (queue.length > 0) {
        const unitId = queue.shift();

        if (!unitId || visitedUnitIds.has(unitId)) {
          continue;
        }

        visitedUnitIds.add(unitId);

        if (!reachablePathStartsByUnitId.has(unitId)) {
          reachablePathStartsByUnitId.set(unitId, new Set());
        }

        reachablePathStartsByUnitId.get(unitId).add(pathStartNodeId);

        if (allowedJoinUnits.has(unitId)) {
          continue;
        }

        for (const nextUnitId of outgoingUnitIdsByUnitId.get(unitId) || []) {
          if (!visitedUnitIds.has(nextUnitId)) {
            queue.push(nextUnitId);
          }
        }
      }
    }

    for (const [unitId, pathStartNodeIds] of reachablePathStartsByUnitId.entries()) {
      if (pathStartNodeIds.size > 1 && !allowedJoinUnits.has(unitId)) {
        return true;
      }
    }

    return false;
  }

  branchStructuralNodeIds(region) {
    return new Set([
      region.entryNodeId,
      ...(region.parentJoinNodeIds || []),
      region.exitNodeId
    ].filter((nodeId) => nodeId));
  }

  branchAllowedJoinNodeIds(region) {
    return new Set([
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
    const selectLayout = (layout) => {
      if (!layout || layout.nodeIds.some((nodeId) => usedNodeIds.has(nodeId))) {
        return false;
      }

      selectedLayouts.push(layout);

      for (const nodeId of layout.nodeIds) {
        usedNodeIds.add(nodeId);
      }

      return true;
    };

    for (const layout of layouts) {
      if (selectLayout(layout)) {
        continue;
      }

      for (const descendantLayout of this.collectProtectedDescendantLayouts(layout)) {
        selectLayout(descendantLayout);
      }
    }

    return selectedLayouts;
  }

  collectProtectedDescendantLayouts(layout) {
    const protectedLayouts = [];
    const visit = (childLayouts) => {
      for (const childLayout of childLayouts || []) {
        if (this.isProtectedRegionType(childLayout.type)) {
          protectedLayouts.push(childLayout);
        }

        visit(childLayout.childLayouts || []);
      }
    };

    visit(layout?.childLayouts || []);

    return protectedLayouts;
  }

  hasOpaqueChildLayout(layouts) {
    const visit = (layout) => {
      if (!layout) {
        return false;
      }

      if (layout.type === "cycle" || layout.type === "complex") {
        return true;
      }

      return (layout.childLayouts || []).some((childLayout) => visit(childLayout));
    };

    return (layouts || []).some((layout) => visit(layout));
  }

  isProtectedRegionType(type) {
    return type === "branch" || type === "cycle" || type === "complex";
  }

  clonePetriNet(petriNet) {
    return {
      ...petriNet,
      nodes: (petriNet.nodes || []).map((node) => ({ ...node })),
      edges: (petriNet.edges || []).map((edge) => ({ ...edge }))
    };
  }
}

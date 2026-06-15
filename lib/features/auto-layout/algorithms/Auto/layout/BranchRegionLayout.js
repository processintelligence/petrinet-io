export default class BranchRegionLayout {

  static $inject = [
    "autoLayoutGeometry",
    "autoLayoutGraph",
    "autoBlockLayoutComposer"
  ];

  constructor(autoLayoutGeometry, autoLayoutGraph, autoBlockLayoutComposer) {
    this.geometry = autoLayoutGeometry;
    this.graph = autoLayoutGraph;
    this.blockLayoutComposer = autoBlockLayoutComposer;
  }

  layout(petriNet, region, regionNodeIds, layouts) {
    if (!region.entryNodeId || !Array.isArray(region.pathStartNodeIds) || region.pathStartNodeIds.length === 0) {
      return this.blockLayoutComposer.compose(petriNet, layouts, region, regionNodeIds);
    }

    const layoutByNodeId = this.graph.buildLayoutByNodeId(layouts);
    const entryLayout = layoutByNodeId.get(region.entryNodeId);
    const parentJoinNodeIds = this.parentJoinNodeIdsForAlignment(region);
    const parentJoinLayouts = this.graph.layoutsForNodeIds(parentJoinNodeIds, layoutByNodeId)
      .filter((layout) => layout !== entryLayout);

    if (!entryLayout) {
      return this.blockLayoutComposer.compose(petriNet, layouts, region, regionNodeIds);
    }

    const specialLayouts = new Set([entryLayout, ...parentJoinLayouts].filter(Boolean));
    const assignedLayouts = new Set(specialLayouts);
    const parentJoinNodeIdSet = new Set(parentJoinNodeIds);
    const lanes = region.pathStartNodeIds.map((pathStartNodeId) => {
      const laneLayouts = this.collectLaneLayouts(
        petriNet,
        region,
        regionNodeIds,
        pathStartNodeId,
        layoutByNodeId,
        parentJoinNodeIdSet,
        specialLayouts,
        assignedLayouts
      );

      for (const layout of laneLayouts) {
        assignedLayouts.add(layout);
      }

      return laneLayouts;
    }).filter((lane) => lane.length > 0);
    const centerlineLayouts = this.collectCenterlineLayouts(
      petriNet,
      regionNodeIds,
      parentJoinNodeIds,
      layoutByNodeId,
      specialLayouts,
      assignedLayouts
    );

    for (const layout of centerlineLayouts) {
      assignedLayouts.add(layout);
    }

    const fallbackLayouts = layouts.filter((layout) => !assignedLayouts.has(layout));

    if (fallbackLayouts.length > 0) {
      lanes.push(fallbackLayouts);
    }

    if (lanes.every((lane) => lane.length === 0) && parentJoinLayouts.length === 0 && centerlineLayouts.length === 0) {
      return this.blockLayoutComposer.compose(petriNet, layouts, region, regionNodeIds);
    }

    return this.alignParentJoins(
      this.positionLanes(
        petriNet,
        region,
        regionNodeIds,
        entryLayout,
        parentJoinLayouts,
        lanes,
        centerlineLayouts
      ),
      region
    );
  }

  collectLaneLayouts(petriNet, region, regionNodeIds, startNodeId, layoutByNodeId, stopNodeIds, specialLayouts, assignedLayouts) {
    const regionNodeIdSet = regionNodeIds instanceof Set ? regionNodeIds : new Set(regionNodeIds);
    const outgoingByNodeId = this.graph.buildOutgoingByNodeId(petriNet);
    const queue = [{ nodeId: startNodeId, depth: 0 }];
    const visitedNodeIds = new Set();
    const laneLayoutInfo = new Map();

    while (queue.length > 0) {
      const { nodeId, depth } = queue.shift();

      if (!nodeId ||
        visitedNodeIds.has(nodeId) ||
        !regionNodeIdSet.has(nodeId) ||
        stopNodeIds.has(nodeId) ||
        nodeId === region.exitNodeId) {
        continue;
      }

      visitedNodeIds.add(nodeId);

      const layout = layoutByNodeId.get(nodeId);

      if (layout) {
        const layoutNodeIds = new Set(layout.nodeIds || []);

        if (!specialLayouts.has(layout) && !assignedLayouts.has(layout) && !laneLayoutInfo.has(layout)) {
          laneLayoutInfo.set(layout, depth);
        }

        for (const nextNodeId of this.graph.successorsOutsideLayout(layout, outgoingByNodeId, regionNodeIdSet)) {
          if (!visitedNodeIds.has(nextNodeId)) {
            queue.push({ nodeId: nextNodeId, depth: depth + Math.max(1, layoutNodeIds.size) });
          }
        }

        continue;
      }

      for (const edge of outgoingByNodeId.get(nodeId) || []) {
        if (regionNodeIdSet.has(edge.target) && !visitedNodeIds.has(edge.target)) {
          queue.push({ nodeId: edge.target, depth: depth + 1 });
        }
      }
    }

    return [...laneLayoutInfo.entries()]
      .sort(([firstLayout, firstDepth], [secondLayout, secondDepth]) =>
        firstDepth - secondDepth || String(firstLayout.id).localeCompare(String(secondLayout.id))
      )
      .map(([layout]) => layout);
  }

  collectCenterlineLayouts(petriNet, regionNodeIds, parentJoinNodeIds, layoutByNodeId, specialLayouts, assignedLayouts) {
    if (parentJoinNodeIds.length === 0) {
      return [];
    }

    const regionNodeIdSet = regionNodeIds instanceof Set ? regionNodeIds : new Set(regionNodeIds);
    const parentJoinNodeIdSet = new Set(parentJoinNodeIds);
    const outgoingByNodeId = this.graph.buildOutgoingByNodeId(petriNet);
    const queue = [];

    for (const joinNodeId of parentJoinNodeIds) {
      for (const edge of outgoingByNodeId.get(joinNodeId) || []) {
        if (regionNodeIdSet.has(edge.target)) {
          queue.push({ nodeId: edge.target, depth: 0 });
        }
      }
    }

    const visitedNodeIds = new Set();
    const layoutInfo = new Map();

    while (queue.length > 0) {
      const { nodeId, depth } = queue.shift();

      if (!nodeId ||
        visitedNodeIds.has(nodeId) ||
        !regionNodeIdSet.has(nodeId) ||
        parentJoinNodeIdSet.has(nodeId)) {
        continue;
      }

      visitedNodeIds.add(nodeId);

      const layout = layoutByNodeId.get(nodeId);

      if (layout) {
        const layoutNodeIds = new Set(layout.nodeIds || []);

        if (!specialLayouts.has(layout) && !assignedLayouts.has(layout) && !layoutInfo.has(layout)) {
          layoutInfo.set(layout, depth);
        }

        for (const nextNodeId of this.graph.successorsOutsideLayout(layout, outgoingByNodeId, regionNodeIdSet)) {
          if (!visitedNodeIds.has(nextNodeId)) {
            queue.push({ nodeId: nextNodeId, depth: depth + Math.max(1, layoutNodeIds.size) });
          }
        }

        continue;
      }

      for (const edge of outgoingByNodeId.get(nodeId) || []) {
        if (regionNodeIdSet.has(edge.target) && !visitedNodeIds.has(edge.target)) {
          queue.push({ nodeId: edge.target, depth: depth + 1 });
        }
      }
    }

    return [...layoutInfo.entries()]
      .sort(([firstLayout, firstDepth], [secondLayout, secondDepth]) =>
        firstDepth - secondDepth || String(firstLayout.id).localeCompare(String(secondLayout.id))
      )
      .map(([layout]) => layout);
  }

  positionLanes(petriNet, region, regionNodeIds, entryLayout, parentJoinLayouts, lanes, centerlineLayouts) {
    const entryBlock = this.geometry.toBlockNode(entryLayout);
    const laneHeights = lanes.map((lane) =>
      Math.max(...lane.map((layout) => Math.max(this.geometry.minimumBlockSize, layout.height)), this.geometry.minimumBlockSize)
    );
    const laneWidths = lanes.map((lane) =>
      lane.reduce((width, layout, index) =>
        width + Math.max(this.geometry.minimumBlockSize, layout.width) + (index === 0 ? 0 : this.geometry.blockHorizontalGap),
        0
      )
    );
    const totalLaneHeight = laneHeights.reduce((sum, height, index) =>
      sum + height + (index === 0 ? 0 : this.geometry.blockVerticalGap),
      0
    );
    const laneStartX = entryBlock.width + this.geometry.blockHorizontalGap;
    const centerlineStartX = laneStartX + Math.max(...laneWidths, this.geometry.minimumBlockSize) + this.geometry.blockHorizontalGap;
    let laneY = -totalLaneHeight / 2;
    const blockPlacements = [{
      layout: entryLayout,
      x: 0,
      y: -entryBlock.height / 2
    }];

    lanes.forEach((lane, laneIndex) => {
      const laneHeight = laneHeights[laneIndex];
      let x = laneStartX;

      for (const layout of lane) {
        const block = this.geometry.toBlockNode(layout);

        blockPlacements.push({
          layout,
          x,
          y: laneY + (laneHeight - block.height) / 2
        });
        x += block.width + this.geometry.blockHorizontalGap;
      }

      laneY += laneHeight + this.geometry.blockVerticalGap;
    });

    const orderedCenterlineLayouts = this.orderCenterlineLayouts(
      petriNet,
      region,
      regionNodeIds,
      [...parentJoinLayouts, ...centerlineLayouts]
    );
    let centerlineX = centerlineStartX;

    for (const layout of orderedCenterlineLayouts) {
      const block = this.geometry.toBlockNode(layout);

      blockPlacements.push({
        layout,
        x: centerlineX,
        y: -block.height / 2
      });
      centerlineX += block.width + this.geometry.blockHorizontalGap;
    }

    const positionedNodes = blockPlacements.flatMap(({ layout, x, y }, index) =>
      (layout.nodes || []).map((node) => ({
        ...node,
        layoutRankX: index,
        layoutRankY: 0,
        x: x + node.x,
        y: y + node.y
      }))
    );
    const normalizedNodes = this.geometry.normalizeNodes(positionedNodes);

    return this.geometry.buildLayout(
      region,
      normalizedNodes.nodes,
      new Set(positionedNodes.map((node) => node.id)),
      normalizedNodes.bounds
    );
  }

  orderCenterlineLayouts(petriNet, region, regionNodeIds, layouts) {
    const distanceByNodeId = this.distanceByNodeIdFromEntry(petriNet, region.entryNodeId, regionNodeIds);
    const uniqueLayouts = [...new Set(layouts)];
    const dependencyRankByLayout = this.centerlineDependencyRankByLayout(petriNet, uniqueLayouts);

    return uniqueLayouts.sort((first, second) =>
      (dependencyRankByLayout.get(first) || 0) - (dependencyRankByLayout.get(second) || 0) ||
      this.layoutDistance(first, distanceByNodeId) - this.layoutDistance(second, distanceByNodeId) ||
      String(first.id).localeCompare(String(second.id))
    );
  }

  centerlineDependencyRankByLayout(petriNet, layouts) {
    const layoutByNodeId = this.graph.buildLayoutByNodeId(layouts);
    const incomingLayoutsByLayout = new Map(layouts.map((layout) => [layout, new Set()]));
    const outgoingLayoutsByLayout = new Map(layouts.map((layout) => [layout, new Set()]));
    const indegreeByLayout = new Map(layouts.map((layout) => [layout, 0]));

    for (const edge of petriNet.edges || []) {
      const sourceLayout = layoutByNodeId.get(edge.source);
      const targetLayout = layoutByNodeId.get(edge.target);

      if (!sourceLayout || !targetLayout || sourceLayout === targetLayout) {
        continue;
      }

      const outgoingLayouts = outgoingLayoutsByLayout.get(sourceLayout);

      if (outgoingLayouts.has(targetLayout)) {
        continue;
      }

      outgoingLayouts.add(targetLayout);
      incomingLayoutsByLayout.get(targetLayout).add(sourceLayout);
      indegreeByLayout.set(targetLayout, (indegreeByLayout.get(targetLayout) || 0) + 1);
    }

    const rankByLayout = new Map(layouts.map((layout) => [layout, 0]));
    const queue = layouts
      .filter((layout) => (indegreeByLayout.get(layout) || 0) === 0)
      .sort((first, second) => String(first.id).localeCompare(String(second.id)));
    const processedLayouts = new Set();

    while (queue.length > 0) {
      const layout = queue.shift();

      if (processedLayouts.has(layout)) {
        continue;
      }

      processedLayouts.add(layout);

      for (const nextLayout of outgoingLayoutsByLayout.get(layout) || []) {
        rankByLayout.set(nextLayout, Math.max(
          rankByLayout.get(nextLayout) || 0,
          (rankByLayout.get(layout) || 0) + 1
        ));
        indegreeByLayout.set(nextLayout, (indegreeByLayout.get(nextLayout) || 0) - 1);

        if ((indegreeByLayout.get(nextLayout) || 0) === 0) {
          queue.push(nextLayout);
          queue.sort((first, second) =>
            (rankByLayout.get(first) || 0) - (rankByLayout.get(second) || 0) ||
            String(first.id).localeCompare(String(second.id))
          );
        }
      }
    }

    for (const layout of layouts) {
      if (processedLayouts.has(layout)) {
        continue;
      }

      const predecessorRanks = [...(incomingLayoutsByLayout.get(layout) || [])]
        .map((predecessor) => rankByLayout.get(predecessor))
        .filter((rank) => Number.isFinite(rank));

      if (predecessorRanks.length > 0) {
        rankByLayout.set(layout, Math.max(...predecessorRanks) + 1);
      }
    }

    return rankByLayout;
  }

  distanceByNodeIdFromEntry(petriNet, entryNodeId, regionNodeIds) {
    const regionNodeIdSet = regionNodeIds instanceof Set ? regionNodeIds : new Set(regionNodeIds);
    const outgoingByNodeId = this.graph.buildOutgoingByNodeId(petriNet);
    const distances = new Map([[entryNodeId, 0]]);
    const queue = [entryNodeId];

    while (queue.length > 0) {
      const nodeId = queue.shift();
      const currentDistance = distances.get(nodeId) || 0;

      for (const edge of outgoingByNodeId.get(nodeId) || []) {
        if (!regionNodeIdSet.has(edge.target) || distances.has(edge.target)) {
          continue;
        }

        distances.set(edge.target, currentDistance + 1);
        queue.push(edge.target);
      }
    }

    return distances;
  }

  layoutDistance(layout, distanceByNodeId) {
    const distances = (layout.nodeIds || [])
      .map((nodeId) => distanceByNodeId.get(nodeId))
      .filter((distance) => Number.isFinite(distance));

    return distances.length > 0 ? Math.min(...distances) : Number.MAX_SAFE_INTEGER;
  }

  alignParentJoins(layout, region) {
    const parentJoinNodeIds = this.parentJoinNodeIdsForAlignment(region);

    if (!region.entryNodeId || parentJoinNodeIds.length === 0) {
      return layout;
    }

    const entryNode = (layout.nodes || []).find((node) => node.id === region.entryNodeId);

    if (!entryNode) {
      return layout;
    }

    const entryCenterY = entryNode.y + ((Number.isFinite(entryNode.height) ? entryNode.height : 0) / 2);
    const parentJoinNodeIdSet = new Set(parentJoinNodeIds);
    const nodes = layout.nodes.map((node) =>
      parentJoinNodeIdSet.has(node.id)
        ? {
          ...node,
          y: entryCenterY - (Number.isFinite(node.height) ? node.height : 0) / 2
        }
        : node
    );
    const normalizedNodes = this.geometry.normalizeNodes(nodes);

    return this.geometry.buildLayout(
      region,
      normalizedNodes.nodes,
      new Set(layout.nodeIds || nodes.map((node) => node.id)),
      normalizedNodes.bounds
    );
  }

  parentJoinNodeIdsForAlignment(region) {
    return [...new Set([
      ...(region.parentJoinNodeIds || []),
      region.exitNodeId
    ].filter((nodeId) => nodeId))];
  }
}

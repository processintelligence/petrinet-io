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
    const boundaryLayouts = this.collectBoundaryLayouts(region, layoutByNodeId, specialLayouts);

    for (const layout of boundaryLayouts) {
      assignedLayouts.add(layout);
    }

    const parentJoinNodeIdSet = new Set(parentJoinNodeIds);
    const branchLanes = region.pathStartNodeIds.map((pathStartNodeId) => {
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
    const laneBoundaryLayouts = new Set();
    const branchLanesWithBoundaries = this.insertBoundaryLayoutsIntoLanes(
      petriNet,
      branchLanes,
      boundaryLayouts,
      laneBoundaryLayouts
    );
    const lanes = this.orderBranchLanes(branchLanesWithBoundaries);
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
        centerlineLayouts,
        boundaryLayouts.filter((layout) => !laneBoundaryLayouts.has(layout)),
        layouts
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

  collectBoundaryLayouts(region, layoutByNodeId, specialLayouts) {
    const boundaryLayouts = [];
    const seenLayouts = new Set();
    const absorbedBoundaryNodeIds = new Set(region.absorbedBoundaryNodeIds || []);

    for (const nodeId of region.absorbedBoundaryNodeIds || []) {
      const layout = layoutByNodeId.get(nodeId);

      if (!layout ||
        specialLayouts.has(layout) ||
        seenLayouts.has(layout) ||
        (layout.nodeIds || []).some((layoutNodeId) => !absorbedBoundaryNodeIds.has(layoutNodeId))) {
        continue;
      }

      seenLayouts.add(layout);
      boundaryLayouts.push(layout);
    }

    return boundaryLayouts;
  }

  insertBoundaryLayoutsIntoLanes(petriNet, lanes, boundaryLayouts, insertedBoundaryLayouts) {
    if (!Array.isArray(lanes) || lanes.length === 0 || !Array.isArray(boundaryLayouts) || boundaryLayouts.length === 0) {
      return lanes;
    }

    const lanesWithBoundaries = lanes.map((lane) => [...lane]);
    const layoutByNodeId = this.graph.buildLayoutByNodeId(lanesWithBoundaries.flat());

    for (const boundaryLayout of boundaryLayouts) {
      if (this.insertBoundaryLayoutIntoLane(petriNet, lanesWithBoundaries, layoutByNodeId, boundaryLayout)) {
        insertedBoundaryLayouts.add(boundaryLayout);
      }
    }

    return lanesWithBoundaries;
  }

  insertBoundaryLayoutIntoLane(petriNet, lanes, layoutByNodeId, boundaryLayout) {
    const boundaryNodeIds = new Set(boundaryLayout.nodeIds || []);

    for (const edge of petriNet.edges || []) {
      if (boundaryNodeIds.has(edge.source)) {
        const targetLayout = layoutByNodeId.get(edge.target);

        if (targetLayout && this.insertLayoutBefore(lanes, targetLayout, boundaryLayout)) {
          return true;
        }
      }

      if (boundaryNodeIds.has(edge.target)) {
        const sourceLayout = layoutByNodeId.get(edge.source);

        if (sourceLayout && this.insertLayoutAfter(lanes, sourceLayout, boundaryLayout)) {
          return true;
        }
      }
    }

    return false;
  }

  insertLayoutBefore(lanes, targetLayout, insertedLayout) {
    for (const lane of lanes) {
      const targetIndex = lane.indexOf(targetLayout);

      if (targetIndex === -1 || lane.includes(insertedLayout)) {
        continue;
      }

      lane.splice(targetIndex, 0, insertedLayout);
      return true;
    }

    return false;
  }

  insertLayoutAfter(lanes, sourceLayout, insertedLayout) {
    for (const lane of lanes) {
      const sourceIndex = lane.indexOf(sourceLayout);

      if (sourceIndex === -1 || lane.includes(insertedLayout)) {
        continue;
      }

      lane.splice(sourceIndex + 1, 0, insertedLayout);
      return true;
    }

    return false;
  }

  orderBranchLanes(lanes) {
    if (!Array.isArray(lanes) || lanes.length < 3) {
      return lanes;
    }

    const orderedSlots = this.centerOutLaneSlots(lanes.length);
    const orderedLanes = new Array(lanes.length);

    lanes
      .map((lane, index) => ({
        lane,
        index,
        complexity: this.laneComplexity(lane)
      }))
      .sort((first, second) =>
        first.complexity - second.complexity ||
        first.index - second.index
      )
      .forEach((entry, index) => {
        orderedLanes[orderedSlots[index]] = entry.lane;
      });

    return orderedLanes.filter(Boolean);
  }

  centerOutLaneSlots(count) {
    const center = (count - 1) / 2;

    return Array.from({ length: count }, (_, index) => index)
      .sort((first, second) =>
        Math.abs(first - center) - Math.abs(second - center) ||
        first - second
      );
  }

  laneComplexity(lane) {
    return lane.reduce((complexity, layout, index) =>
      complexity +
      (layout.nodeIds || []).length * 100 +
      Math.max(this.geometry.minimumBlockSize, layout.width || 0) +
      (index === 0 ? 0 : this.geometry.blockHorizontalGap),
      0
    );
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

  positionLanes(petriNet, region, regionNodeIds, entryLayout, parentJoinLayouts, lanes, centerlineLayouts, boundaryLayouts = [], layouts = []) {
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
    const boundaryBeforeByTargetLayout = this.boundaryLayoutsBeforeTargets(
      petriNet,
      boundaryLayouts,
      orderedCenterlineLayouts
    );
    const placedBoundaryLayouts = new Set();
    let centerlineX = centerlineStartX;

    for (const layout of orderedCenterlineLayouts) {
      const boundaryColumn = boundaryBeforeByTargetLayout.get(layout) || [];

      if (boundaryColumn.length > 0) {
        const column = this.placeBoundaryColumnBeforeTarget(boundaryColumn, layout, centerlineX);

        blockPlacements.push(...column.placements);
        column.layouts.forEach((boundaryLayout) => placedBoundaryLayouts.add(boundaryLayout));
        centerlineX += column.width + this.geometry.blockHorizontalGap;
      }

      const block = this.geometry.toBlockNode(layout);

      blockPlacements.push({
        layout,
        x: centerlineX,
        y: -block.height / 2
      });
      centerlineX += block.width + this.geometry.blockHorizontalGap;
    }

    for (const placement of this.positionBoundaryLayouts(
      petriNet,
      region,
      boundaryLayouts.filter((layout) => !placedBoundaryLayouts.has(layout)),
      blockPlacements
    )) {
      blockPlacements.push(placement);
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
      {
        ...region,
        childLayouts: layouts
      },
      normalizedNodes.nodes,
      new Set(positionedNodes.map((node) => node.id)),
      normalizedNodes.bounds
    );
  }

  boundaryLayoutsBeforeTargets(petriNet, boundaryLayouts, targetLayouts) {
    const layoutByNodeId = this.graph.buildLayoutByNodeId(targetLayouts);
    const boundaryBeforeByTargetLayout = new Map();

    for (const boundaryLayout of boundaryLayouts || []) {
      const boundaryNodeIds = new Set(boundaryLayout.nodeIds || []);

      for (const edge of petriNet.edges || []) {
        if (!boundaryNodeIds.has(edge.source)) {
          continue;
        }

        const targetLayout = layoutByNodeId.get(edge.target);

        if (!targetLayout) {
          continue;
        }

        if (!boundaryBeforeByTargetLayout.has(targetLayout)) {
          boundaryBeforeByTargetLayout.set(targetLayout, []);
        }

        boundaryBeforeByTargetLayout.get(targetLayout).push(boundaryLayout);
        break;
      }
    }

    return boundaryBeforeByTargetLayout;
  }

  placeBoundaryColumnBeforeTarget(boundaryLayouts, targetLayout, x) {
    const layoutBlocks = boundaryLayouts.map((layout) => ({
      layout,
      block: this.geometry.toBlockNode(layout)
    }));
    const columnWidth = Math.max(
      ...layoutBlocks.map(({ block }) => block.width),
      this.geometry.minimumBlockSize
    );
    const columnHeight = layoutBlocks.reduce((height, { block }, index) =>
      height + block.height + (index === 0 ? 0 : this.geometry.blockVerticalGap),
      0
    );
    let y = -(columnHeight / 2);

    return {
      width: columnWidth,
      layouts: boundaryLayouts,
      placements: layoutBlocks.map(({ layout, block }) => {
        const placement = {
          layout,
          x: x + ((columnWidth - block.width) / 2),
          y
        };

        y += block.height + this.geometry.blockVerticalGap;

        return placement;
      })
    };
  }

  positionBoundaryLayouts(petriNet, region, boundaryLayouts, blockPlacements) {
    if (!Array.isArray(boundaryLayouts) || boundaryLayouts.length === 0) {
      return [];
    }

    const placementByNodeId = this.placementByNodeId(blockPlacements);

    return boundaryLayouts
      .map((layout) => this.positionBoundaryLayout(petriNet, region, layout, placementByNodeId))
      .filter(Boolean);
  }

  placementByNodeId(blockPlacements) {
    const placementByNodeId = new Map();

    for (const placement of blockPlacements) {
      for (const nodeId of placement.layout.nodeIds || []) {
        placementByNodeId.set(nodeId, placement);
      }
    }

    return placementByNodeId;
  }

  positionBoundaryLayout(petriNet, region, layout, placementByNodeId) {
    const nodeId = (layout.nodeIds || [])[0];

    if (!nodeId) {
      return null;
    }

    const outgoingTargetPlacement = (petriNet.edges || [])
      .filter((edge) => edge.source === nodeId)
      .map((edge) => placementByNodeId.get(edge.target))
      .find(Boolean);

    if (outgoingTargetPlacement) {
      return this.placeBoundaryBeforeTarget(layout, outgoingTargetPlacement);
    }

    const incomingSourcePlacement = (petriNet.edges || [])
      .filter((edge) => edge.target === nodeId)
      .map((edge) => placementByNodeId.get(edge.source))
      .find(Boolean);

    if (incomingSourcePlacement) {
      return this.placeBoundaryAfterSource(layout, incomingSourcePlacement);
    }

    return null;
  }

  placeBoundaryBeforeTarget(layout, targetPlacement) {
    const block = this.geometry.toBlockNode(layout);
    const targetBlock = this.geometry.toBlockNode(targetPlacement.layout);

    return {
      layout,
      x: targetPlacement.x - block.width - this.geometry.blockHorizontalGap,
      y: targetPlacement.y + ((targetBlock.height - block.height) / 2)
    };
  }

  placeBoundaryAfterSource(layout, sourcePlacement) {
    const block = this.geometry.toBlockNode(layout);
    const sourceBlock = this.geometry.toBlockNode(sourcePlacement.layout);

    return {
      layout,
      x: sourcePlacement.x + sourceBlock.width + this.geometry.blockHorizontalGap,
      y: sourcePlacement.y + ((sourceBlock.height - block.height) / 2)
    };
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
    const protectedChildNodeIds = new Set((layout.childLayouts || [])
      .filter((childLayout) => this.isProtectedRegionType(childLayout.type))
      .flatMap((childLayout) => childLayout.nodeIds || []));
    const nodes = layout.nodes.map((node) =>
      parentJoinNodeIdSet.has(node.id) && !protectedChildNodeIds.has(node.id)
        ? {
          ...node,
          y: entryCenterY - (Number.isFinite(node.height) ? node.height : 0) / 2
        }
        : node
    );
    const normalizedNodes = this.geometry.normalizeNodes(nodes);

    return this.geometry.buildLayout(
      {
        ...region,
        childLayouts: layout.childLayouts
      },
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

  isProtectedRegionType(type) {
    return type === "branch" || type === "cycle" || type === "complex";
  }
}

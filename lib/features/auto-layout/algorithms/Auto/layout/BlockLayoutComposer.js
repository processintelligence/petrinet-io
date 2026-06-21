export default class BlockLayoutComposer {

  static $inject = [
    "autoLayoutGeometry"
  ];

  constructor(autoLayoutGeometry) {
    this.geometry = autoLayoutGeometry;
  }

  compose(petriNet, layouts, region, restrictedNodeIds = null) {
    const blockNodes = layouts.map((layout) => ({
      id: this.geometry.blockId(layout),
      type: "block",
      x: 0,
      y: 0,
      width: Math.max(this.geometry.minimumBlockSize, layout.width),
      height: Math.max(this.geometry.minimumBlockSize, layout.height),
      layout
    }));
    const blockIdByNodeId = new Map();

    for (const blockNode of blockNodes) {
      for (const nodeId of blockNode.layout.nodeIds) {
        blockIdByNodeId.set(nodeId, blockNode.id);
      }
    }

    const blockGraph = {
      nodes: blockNodes.map(({ layout, ...node }) => node),
      edges: this.buildBlockEdges(petriNet, blockIdByNodeId, restrictedNodeIds)
    };
    const laidOutBlocks = this.layoutBlocksWithRanks(blockGraph);
    const blockPositionById = new Map(
      laidOutBlocks.nodes.map((node) => [node.id, node])
    );
    const composedNodes = [];

    for (const blockNode of blockNodes) {
      const blockPosition = blockPositionById.get(blockNode.id);

      if (!blockPosition) {
        continue;
      }

      for (const node of blockNode.layout.nodes) {
        composedNodes.push({
          ...node,
          layoutRankX: blockPosition.layoutRankX,
          layoutRankY: blockPosition.layoutRankY,
          x: blockPosition.x + node.x,
          y: blockPosition.y + node.y
        });
      }
    }

    const normalizedNodes = this.geometry.normalizeNodes(composedNodes);

    return this.geometry.buildLayout(
      {
        ...region,
        childLayouts: layouts
      },
      normalizedNodes.nodes,
      new Set(composedNodes.map((node) => node.id)),
      normalizedNodes.bounds
    );
  }

  layoutBlocksWithRanks(blockGraph) {
    const rankedBlocks = this.assignBlockRanks(blockGraph);
    const layers = this.groupBlocksByRank(rankedBlocks);

    return {
      ...blockGraph,
      nodes: this.positionBlockLayers(layers).flatMap((layer) => layer)
    };
  }

  assignBlockRanks(blockGraph) {
    const nodes = (blockGraph.nodes || []).map((node) => ({ ...node }));
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const incomingByNodeId = new Map(nodes.map((node) => [node.id, []]));
    const outgoingByNodeId = new Map(nodes.map((node) => [node.id, []]));

    for (const edge of this.withoutCycleClosingEdges(blockGraph)) {
      if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) {
        continue;
      }

      incomingByNodeId.get(edge.target).push(edge);
      outgoingByNodeId.get(edge.source).push(edge);
    }

    const rankByNodeId = new Map(nodes.map((node) => [node.id, 0]));
    const indegreeByNodeId = new Map(nodes.map((node) => [node.id, incomingByNodeId.get(node.id).length]));
    const queue = nodes
      .filter((node) => indegreeByNodeId.get(node.id) === 0)
      .map((node) => node.id)
      .sort((first, second) => String(first).localeCompare(String(second)));
    const processedNodeIds = new Set();

    while (queue.length > 0) {
      const nodeId = queue.shift();

      if (processedNodeIds.has(nodeId)) {
        continue;
      }

      processedNodeIds.add(nodeId);

      for (const edge of outgoingByNodeId.get(nodeId) || []) {
        rankByNodeId.set(edge.target, Math.max(
          rankByNodeId.get(edge.target) || 0,
          (rankByNodeId.get(nodeId) || 0) + 1
        ));
        indegreeByNodeId.set(edge.target, indegreeByNodeId.get(edge.target) - 1);

        if (indegreeByNodeId.get(edge.target) === 0) {
          queue.push(edge.target);
          queue.sort((first, second) => String(first).localeCompare(String(second)));
        }
      }
    }

    for (const node of nodes) {
      if (processedNodeIds.has(node.id)) {
        continue;
      }

      const predecessorRanks = (incomingByNodeId.get(node.id) || [])
        .map((edge) => rankByNodeId.get(edge.source))
        .filter((rank) => Number.isFinite(rank));

      rankByNodeId.set(node.id, predecessorRanks.length > 0
        ? Math.max(...predecessorRanks)
        : 0
      );
    }

    return nodes.map((node) => ({
      ...node,
      layoutRankX: rankByNodeId.get(node.id) || 0
    }));
  }

  withoutCycleClosingEdges(blockGraph) {
    const acceptedEdges = [];
    const outgoingByNodeId = new Map(
      (blockGraph.nodes || []).map((node) => [node.id, []])
    );
    const nodeIds = new Set((blockGraph.nodes || []).map((node) => node.id));

    for (const edge of blockGraph.edges || []) {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        continue;
      }

      if (this.hasPath(edge.target, edge.source, outgoingByNodeId)) {
        continue;
      }

      acceptedEdges.push(edge);
      outgoingByNodeId.get(edge.source).push(edge.target);
    }

    return acceptedEdges;
  }

  hasPath(sourceNodeId, targetNodeId, outgoingByNodeId) {
    const queue = [sourceNodeId];
    const visitedNodeIds = new Set();

    while (queue.length > 0) {
      const nodeId = queue.shift();

      if (nodeId === targetNodeId) {
        return true;
      }

      if (visitedNodeIds.has(nodeId)) {
        continue;
      }

      visitedNodeIds.add(nodeId);

      for (const nextNodeId of outgoingByNodeId.get(nodeId) || []) {
        queue.push(nextNodeId);
      }
    }

    return false;
  }

  groupBlocksByRank(nodes) {
    const layersByRank = new Map();

    for (const node of nodes) {
      const rank = Number.isFinite(node.layoutRankX) ? node.layoutRankX : 0;

      if (!layersByRank.has(rank)) {
        layersByRank.set(rank, []);
      }

      layersByRank.get(rank).push(node);
    }

    return [...layersByRank.entries()]
      .sort(([firstRank], [secondRank]) => firstRank - secondRank)
      .map(([rank, layer]) => layer
        .sort((first, second) => String(first.id).localeCompare(String(second.id)))
        .map((node, index) => ({
          ...node,
          layoutRankX: rank,
          layoutRankY: index
        }))
      );
  }

  positionBlockLayers(layers) {
    const layerWidths = layers.map((layer) =>
      Math.max(...layer.map((node) => node.width || this.geometry.minimumBlockSize), this.geometry.minimumBlockSize)
    );
    const layerX = [];
    let xCursor = 0;

    for (let index = 0; index < layers.length; index++) {
      layerX[index] = xCursor;
      xCursor += layerWidths[index] + this.geometry.blockHorizontalGap;
    }

    return layers.map((layer, layerIndex) => {
      const layerHeight = layer.reduce(
        (sum, node, index) =>
          sum + (node.height || this.geometry.minimumBlockSize) + (index === 0 ? 0 : this.geometry.blockVerticalGap),
        0
      );
      let yCursor = -layerHeight / 2;

      return layer.map((node, nodeIndex) => {
        const positionedNode = {
          ...node,
          layoutRankY: nodeIndex,
          x: layerX[layerIndex] + (layerWidths[layerIndex] - (node.width || this.geometry.minimumBlockSize)) / 2,
          y: yCursor
        };

        yCursor += (node.height || this.geometry.minimumBlockSize) + this.geometry.blockVerticalGap;

        return positionedNode;
      });
    });
  }

  buildBlockEdges(petriNet, blockIdByNodeId, restrictedNodeIds) {
    const edgeKeys = new Set();
    const blockEdges = [];

    for (const edge of petriNet.edges || []) {
      if (restrictedNodeIds &&
        (!restrictedNodeIds.has(edge.source) || !restrictedNodeIds.has(edge.target))) {
        continue;
      }

      const source = blockIdByNodeId.get(edge.source);
      const target = blockIdByNodeId.get(edge.target);

      if (!source || !target || source === target) {
        continue;
      }

      const key = `${source}::${target}`;

      if (edgeKeys.has(key)) {
        continue;
      }

      edgeKeys.add(key);
      blockEdges.push({
        id: `auto-block-edge-${blockEdges.length}`,
        source,
        target
      });
    }

    return blockEdges;
  }
}

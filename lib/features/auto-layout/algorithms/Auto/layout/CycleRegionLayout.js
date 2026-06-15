export default class CycleRegionLayout {

  static $inject = [
    "circularLayoutAlgorithm",
    "autoLayoutGeometry",
    "autoLayoutGraph"
  ];

  constructor(circularLayoutAlgorithm, autoLayoutGeometry, autoLayoutGraph) {
    this.circularLayoutAlgorithm = circularLayoutAlgorithm;
    this.geometry = autoLayoutGeometry;
    this.graph = autoLayoutGraph;
  }

  layout(petriNet, region, nodeIds) {
    const boundaryNodeIds = new Set(
      (region.absorbedBoundaryNodeIds || []).filter((nodeId) => nodeIds.has(nodeId))
    );
    const coreNodeIds = new Set(
      [...nodeIds].filter((nodeId) => !boundaryNodeIds.has(nodeId))
    );

    if (boundaryNodeIds.size > 0 && coreNodeIds.size >= 3) {
      return this.layoutWithBoundaryNodes(petriNet, region, nodeIds, coreNodeIds, boundaryNodeIds);
    }

    const subgraph = this.graph.buildSubgraph(petriNet, nodeIds);

    if (subgraph.nodes.length === 0) {
      return null;
    }

    let laidOutPN = this.circularLayoutAlgorithm.layout(subgraph);
    laidOutPN = this.orientCircularRegion(laidOutPN, petriNet, nodeIds);

    const normalizedNodes = this.geometry.normalizeNodes(
      laidOutPN.nodes.filter((node) => nodeIds.has(node.id))
    );

    return this.geometry.buildLayout(region, normalizedNodes.nodes, nodeIds, normalizedNodes.bounds);
  }

  layoutWithBoundaryNodes(petriNet, region, nodeIds, coreNodeIds, boundaryNodeIds) {
    const subgraph = this.graph.buildSubgraph(petriNet, coreNodeIds);

    let laidOutPN = this.circularLayoutAlgorithm.layout(subgraph);
    laidOutPN = this.orientCircularRegion(laidOutPN, petriNet, coreNodeIds);

    const nodesWithBoundary = this.placeBoundaryNodesAroundCore(
      laidOutPN.nodes,
      petriNet,
      coreNodeIds,
      boundaryNodeIds
    );
    const normalizedNodes = this.geometry.normalizeNodes(nodesWithBoundary);

    return this.geometry.buildLayout(region, normalizedNodes.nodes, nodeIds, normalizedNodes.bounds);
  }

  placeBoundaryNodesAroundCore(coreNodes, petriNet, coreNodeIds, boundaryNodeIds) {
    const coreBounds = this.geometry.getBounds(coreNodes);
    const coreNodeById = new Map(coreNodes.map((node) => [node.id, node]));
    const incomingByNodeId = this.graph.buildIncomingByNodeId(petriNet);
    const outgoingByNodeId = this.graph.buildOutgoingByNodeId(petriNet);
    const boundaryNodesBySide = {
      left: [],
      right: []
    };

    for (const nodeId of boundaryNodeIds) {
      const node = (petriNet.nodes || []).find((candidate) => candidate.id === nodeId);

      if (!node) {
        continue;
      }

      const incoming = incomingByNodeId.get(nodeId) || [];
      const outgoing = outgoingByNodeId.get(nodeId) || [];
      const outgoingCoreEdge = outgoing.find((edge) => coreNodeIds.has(edge.target));
      const incomingCoreEdge = incoming.find((edge) => coreNodeIds.has(edge.source));
      const connectsToCore = Boolean(outgoingCoreEdge);
      const connectsFromCore = Boolean(incomingCoreEdge);
      const side = connectsToCore && !connectsFromCore
        ? "left"
        : "right";
      const anchorCoreNode = side === "left"
        ? coreNodeById.get(outgoingCoreEdge?.target)
        : coreNodeById.get(incomingCoreEdge?.source);
      const anchorCenter = anchorCoreNode
        ? this.geometry.getNodeCenter(anchorCoreNode)
        : {
          x: coreBounds.minX + coreBounds.width / 2,
          y: coreBounds.minY + coreBounds.height / 2
        };

      boundaryNodesBySide[side].push({
        ...node,
        boundaryAnchorY: anchorCenter.y
      });
    }

    return [
      ...coreNodes.map((node) => ({ ...node })),
      ...this.positionBoundarySide(boundaryNodesBySide.left, "left", coreBounds),
      ...this.positionBoundarySide(boundaryNodesBySide.right, "right", coreBounds)
    ];
  }

  positionBoundarySide(nodes, side, coreBounds) {
    if (nodes.length === 0) {
      return [];
    }

    return nodes
      .sort((first, second) =>
        (first.boundaryAnchorY || 0) - (second.boundaryAnchorY || 0) ||
        String(first.id).localeCompare(String(second.id))
      )
      .map((node) => ({
        ...node,
        x: side === "left"
          ? coreBounds.minX - this.geometry.boundaryNodeGap - (node.width || 0)
          : coreBounds.maxX + this.geometry.boundaryNodeGap,
        y: (node.boundaryAnchorY || coreBounds.minY + coreBounds.height / 2) - (node.height || 0) / 2
      }))
      .reduce((positionedNodes, node) => {
        const previousNode = positionedNodes[positionedNodes.length - 1];
        const minimumY = previousNode
          ? previousNode.y + (previousNode.height || 0) + this.geometry.blockVerticalGap
          : -Infinity;

        positionedNodes.push({
          ...node,
          y: Math.max(node.y, minimumY)
        });

        return positionedNodes;
      }, [])
      .map((node) => {
        const { boundaryAnchorY, ...positionedNode } = node;

        return positionedNode;
      });
  }

  orientCircularRegion(laidOutPN, petriNet, nodeIds) {
    const boundary = this.findRegionBoundaryNodes(petriNet, nodeIds);

    if (!boundary.entryNodeId || !boundary.exitNodeId || boundary.entryNodeId === boundary.exitNodeId) {
      return laidOutPN;
    }

    const nodeById = new Map((laidOutPN.nodes || []).map((node) => [node.id, node]));
    const entryNode = nodeById.get(boundary.entryNodeId);
    const exitNode = nodeById.get(boundary.exitNodeId);

    if (!entryNode || !exitNode) {
      return laidOutPN;
    }

    const center = laidOutPN.circularCenter || this.geometry.getNodeCenterAverage(laidOutPN.nodes || []);
    const entryCenter = this.geometry.getNodeCenter(entryNode);
    const exitCenter = this.geometry.getNodeCenter(exitNode);
    const dx = exitCenter.x - entryCenter.x;
    const dy = exitCenter.y - entryCenter.y;

    if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.hypot(dx, dy) === 0) {
      return laidOutPN;
    }

    const rotation = -Math.atan2(dy, dx);

    return {
      ...laidOutPN,
      nodes: (laidOutPN.nodes || []).map((node) =>
        this.rotateNodeAroundCenter(node, center, rotation)
      )
    };
  }

  findRegionBoundaryNodes(petriNet, nodeIds) {
    const incomingByNodeId = this.graph.buildIncomingByNodeId(petriNet);
    const outgoingByNodeId = this.graph.buildOutgoingByNodeId(petriNet);
    const entryCandidates = [];
    const exitCandidates = [];

    for (const nodeId of nodeIds) {
      const incoming = incomingByNodeId.get(nodeId) || [];
      const outgoing = outgoingByNodeId.get(nodeId) || [];

      if (incoming.length === 0 || incoming.some((edge) => !nodeIds.has(edge.source))) {
        entryCandidates.push(nodeId);
      }

      if (outgoing.length === 0 || outgoing.some((edge) => !nodeIds.has(edge.target))) {
        exitCandidates.push(nodeId);
      }
    }

    return {
      entryNodeId: this.pickBoundaryNode(entryCandidates),
      exitNodeId: this.pickBoundaryNode(exitCandidates)
    };
  }

  pickBoundaryNode(nodeIds) {
    return [...nodeIds].sort((first, second) => String(first).localeCompare(String(second)))[0] || null;
  }

  rotateNodeAroundCenter(node, center, rotation) {
    const nodeCenter = this.geometry.getNodeCenter(node);
    const relative = {
      x: nodeCenter.x - center.x,
      y: nodeCenter.y - center.y
    };
    const rotatedCenter = {
      x: center.x + relative.x * Math.cos(rotation) - relative.y * Math.sin(rotation),
      y: center.y + relative.x * Math.sin(rotation) + relative.y * Math.cos(rotation)
    };

    return {
      ...node,
      x: rotatedCenter.x - ((Number.isFinite(node.width) ? node.width : 0) / 2),
      y: rotatedCenter.y - ((Number.isFinite(node.height) ? node.height : 0) / 2)
    };
  }

  expandNodeIds(petriNet, nodeIds, allowedNodeIds) {
    const expandedNodeIds = new Set(nodeIds);
    const outgoingByNodeId = this.graph.buildOutgoingByNodeId(petriNet);

    for (const startNodeId of nodeIds) {
      for (const edge of outgoingByNodeId.get(startNodeId) || []) {
        if (nodeIds.has(edge.target) ||
          (allowedNodeIds && !allowedNodeIds.has(edge.target))) {
          continue;
        }

        const pathNodeIds = this.findInteriorPathNodeIds(
          edge.target,
          nodeIds,
          outgoingByNodeId,
          new Set([startNodeId]),
          allowedNodeIds
        );

        if (!pathNodeIds) {
          continue;
        }

        for (const pathNodeId of pathNodeIds) {
          expandedNodeIds.add(pathNodeId);
        }
      }
    }

    return expandedNodeIds;
  }

  findInteriorPathNodeIds(nodeId, cycleNodeIds, outgoingByNodeId, visitedNodeIds, allowedNodeIds) {
    if (cycleNodeIds.has(nodeId)) {
      return new Set();
    }

    if (visitedNodeIds.has(nodeId) || (allowedNodeIds && !allowedNodeIds.has(nodeId))) {
      return null;
    }

    visitedNodeIds.add(nodeId);

    const successfulPathNodeIds = new Set();

    for (const edge of outgoingByNodeId.get(nodeId) || []) {
      if (cycleNodeIds.has(edge.target)) {
        successfulPathNodeIds.add(nodeId);
        continue;
      }

      const childPathNodeIds = this.findInteriorPathNodeIds(
        edge.target,
        cycleNodeIds,
        outgoingByNodeId,
        new Set(visitedNodeIds),
        allowedNodeIds
      );

      if (!childPathNodeIds) {
        continue;
      }

      successfulPathNodeIds.add(nodeId);

      for (const pathNodeId of childPathNodeIds) {
        successfulPathNodeIds.add(pathNodeId);
      }
    }

    return successfulPathNodeIds.size > 0 ? successfulPathNodeIds : null;
  }
}

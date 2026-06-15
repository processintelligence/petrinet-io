export default class SequenceDetector {

  detect(context) {
    const allowedNodeIds = context.allowedNodeIds || null;
    const assignedNodeIds = context.reservedNodeIds || new Set();
    const includeSingleNodeSequences = context.includeSingleNodeSequences || false;
    const visitedNodeIds = new Set();
    const regions = [];

    for (const node of context.analysis.nodes) {
      if (!this.isAllowedNode(allowedNodeIds, node.id) ||
        assignedNodeIds.has(node.id) ||
        visitedNodeIds.has(node.id) ||
        this.hasLinearPrevious(context, node.id, allowedNodeIds, assignedNodeIds) ||
        !this.isLinearNode(context, node.id, allowedNodeIds, assignedNodeIds)) {
        continue;
      }

      const nodeIds = this.collectSequence(context, node.id, allowedNodeIds, assignedNodeIds, visitedNodeIds);

      if (nodeIds.length < 2 &&
        !this.isSingleNodeSequence(context, nodeIds[0], allowedNodeIds, assignedNodeIds, includeSingleNodeSequences)) {
        continue;
      }

      for (const nodeId of nodeIds) {
        visitedNodeIds.add(nodeId);
      }

      regions.push({
        type: "sequence",
        algorithm: "sugiyama",
        nodeIds,
        edgeIds: context.edgeIdsInside(nodeIds)
      });
    }

    return regions;
  }

  collectSequence(context, startNodeId, allowedNodeIds, assignedNodeIds, visitedNodeIds) {
    const nodeIds = [];
    let currentNodeId = startNodeId;

    while (
      currentNodeId &&
      this.isAllowedNode(allowedNodeIds, currentNodeId) &&
      !assignedNodeIds.has(currentNodeId) &&
      !visitedNodeIds.has(currentNodeId) &&
      this.isLinearNode(context, currentNodeId, allowedNodeIds, assignedNodeIds)
    ) {
      nodeIds.push(currentNodeId);

      const outgoing = this.edgesInsideAllowedNodes(
        context.analysis.outgoingByNodeId.get(currentNodeId) || [],
        allowedNodeIds
      );

      if (outgoing.length !== 1) {
        break;
      }

      const nextNodeId = outgoing[0].target;

      if (!this.isLinearNode(context, nextNodeId, allowedNodeIds, assignedNodeIds)) {
        break;
      }

      currentNodeId = nextNodeId;
    }

    return nodeIds;
  }

  hasLinearPrevious(context, nodeId, allowedNodeIds, assignedNodeIds) {
    const incoming = this.edgesInsideAllowedNodes(
      context.analysis.incomingByNodeId.get(nodeId) || [],
      allowedNodeIds
    );

    return incoming.length === 1 &&
      this.isLinearNode(context, incoming[0].source, allowedNodeIds, assignedNodeIds);
  }

  isLinearNode(context, nodeId, allowedNodeIds, assignedNodeIds) {
    if (!this.isAllowedNode(allowedNodeIds, nodeId) || assignedNodeIds.has(nodeId)) {
      return false;
    }

    const incoming = this.edgesInsideAllowedNodes(
      context.analysis.incomingByNodeId.get(nodeId) || [],
      allowedNodeIds
    );
    const outgoing = this.edgesInsideAllowedNodes(
      context.analysis.outgoingByNodeId.get(nodeId) || [],
      allowedNodeIds
    );

    return incoming.length <= 1 && outgoing.length <= 1;
  }

  isSingleNodeSequence(context, nodeId, allowedNodeIds, assignedNodeIds, includeSingleNodeSequences) {
    return nodeId &&
      allowedNodeIds &&
      this.isLinearNode(context, nodeId, allowedNodeIds, new Set()) &&
      (includeSingleNodeSequences || this.hasReservedNeighbor(context, nodeId, allowedNodeIds, assignedNodeIds));
  }

  hasReservedNeighbor(context, nodeId, allowedNodeIds, assignedNodeIds) {
    const connectedEdges = [
      ...(context.analysis.incomingByNodeId.get(nodeId) || []),
      ...(context.analysis.outgoingByNodeId.get(nodeId) || [])
    ];

    return connectedEdges.some((edge) =>
      this.isAllowedNode(allowedNodeIds, edge.source) &&
      this.isAllowedNode(allowedNodeIds, edge.target) &&
      (assignedNodeIds.has(edge.source) || assignedNodeIds.has(edge.target))
    );
  }

  edgesInsideAllowedNodes(edges, allowedNodeIds) {
    return edges.filter((edge) =>
      this.isAllowedNode(allowedNodeIds, edge.source) &&
      this.isAllowedNode(allowedNodeIds, edge.target)
    );
  }

  isAllowedNode(allowedNodeIds, nodeId) {
    return !allowedNodeIds || allowedNodeIds.has(nodeId);
  }
}

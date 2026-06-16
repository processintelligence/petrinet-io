export default class Ordering {

  build(petriNet) {
    const removalEdgeIds = new Set(
      (petriNet.circularRemovalEdges || []).map((edge) => edge.id)
    );
    const orderingNodes = petriNet.nodes.map((node) => ({ ...node }));
    const orderingEdges = petriNet.edges
      .filter((edge) => !removalEdgeIds.has(edge.id))
      .map((edge) => ({ ...edge }));

    const adjacency = this.buildUndirectedAdjacency(orderingNodes, orderingEdges);
    const startNodeId = this.pickStartNodeId(petriNet, orderingNodes, adjacency);
    const dfsOrder = this.buildDfsOrder(adjacency, startNodeId);

    return {
      ...petriNet,
      circularOrderingNodes: orderingNodes,
      circularOrderingEdges: orderingEdges,
      circularDfsOrder: dfsOrder,
      circularSeedPath: dfsOrder,
      circularBranchOrder: [],
      circularOrder: [...dfsOrder]
    };
  }

  buildUndirectedAdjacency(nodes, edges) {
    const adjacency = new Map();

    for (const node of nodes) {
      adjacency.set(node.id, new Set());
    }

    for (const edge of edges) {
      if (!adjacency.has(edge.source) || !adjacency.has(edge.target) || edge.source === edge.target) {
        continue;
      }

      adjacency.get(edge.source).add(edge.target);
      adjacency.get(edge.target).add(edge.source);
    }

    return adjacency;
  }

  pickStartNodeId(petriNet, orderingNodes, adjacency) {
    const reducedNodeIds = new Set(
      (petriNet.circularReducedNodes || []).map((node) => node.id)
    );
    const preferredNodeIds = orderingNodes
      .map((node) => node.id)
      .filter((nodeId) => reducedNodeIds.has(nodeId));

    if (preferredNodeIds.length > 0) {
      return this.pickLowestDegreeNodeId(preferredNodeIds, adjacency);
    }

    return this.pickLowestDegreeNodeId(
      orderingNodes.map((node) => node.id),
      adjacency
    );
  }

  pickLowestDegreeNodeId(nodeIds, adjacency) {
    let bestNodeId = null;
    let bestDegree = Infinity;

    for (const nodeId of nodeIds) {
      const degree = (adjacency.get(nodeId) || new Set()).size;

      if (degree < bestDegree) {
        bestNodeId = nodeId;
        bestDegree = degree;
        continue;
      }

      if (degree === bestDegree && bestNodeId && String(nodeId).localeCompare(String(bestNodeId)) < 0) {
        bestNodeId = nodeId;
      }
    }

    return bestNodeId;
  }

  buildDfsOrder(adjacency, startNodeId) {
    if (!startNodeId) {
      return [];
    }

    const visited = new Set();
    const dfsOrder = [];

    const visitNode = (nodeId) => {
      if (visited.has(nodeId)) {
        return;
      }

      visited.add(nodeId);
      dfsOrder.push(nodeId);

      const neighborIds = Array.from(adjacency.get(nodeId) || []).sort((a, b) =>
        String(a).localeCompare(String(b))
      );

      for (const neighborId of neighborIds) {
        visitNode(neighborId);
      }
    };

    visitNode(startNodeId);

    const remainingNodeIds = Array.from(adjacency.keys())
      .filter((nodeId) => !visited.has(nodeId))
      .sort((a, b) => String(a).localeCompare(String(b)));

    for (const nodeId of remainingNodeIds) {
      visitNode(nodeId);
    }

    return dfsOrder;
  }
}

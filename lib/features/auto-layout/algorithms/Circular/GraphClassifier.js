export default class GraphClassifier {

  isSingleCircle(petriNet) {
    if (!petriNet || !Array.isArray(petriNet.nodes) || petriNet.nodes.length < 2) {
      return false;
    }

    const nodeIds = petriNet.nodes.map((node) => node.id);
    const adjacency = this.buildUndirectedAdjacency(nodeIds, petriNet.edges || []);

    if (!this.isConnected(nodeIds, adjacency)) {
      return false;
    }

    for (const removedNodeId of nodeIds) {
      const remainingNodeIds = nodeIds.filter((nodeId) => nodeId !== removedNodeId);

      if (remainingNodeIds.length === 0) {
        continue;
      }

      if (!this.isConnected(remainingNodeIds, adjacency, removedNodeId)) {
        return false;
      }
    }

    return true;
  }

  buildUndirectedAdjacency(nodeIds, edges) {
    const adjacency = new Map();

    for (const nodeId of nodeIds) {
      adjacency.set(nodeId, new Set());
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

  isConnected(nodeIds, adjacency, ignoredNodeId = null) {
    const visited = new Set();
    const stack = [nodeIds[0]];

    while (stack.length > 0) {
      const nodeId = stack.pop();

      if (nodeId === ignoredNodeId || visited.has(nodeId)) {
        continue;
      }

      visited.add(nodeId);

      for (const neighborId of adjacency.get(nodeId) || []) {
        if (neighborId !== ignoredNodeId && !visited.has(neighborId)) {
          stack.push(neighborId);
        }
      }
    }

    return visited.size === nodeIds.length;
  }
}

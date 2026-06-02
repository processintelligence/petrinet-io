export default class GraphAnalysis {

  analyze(petriNet) {
    const nodes = Array.isArray(petriNet?.nodes) ? petriNet.nodes : [];
    const edges = Array.isArray(petriNet?.edges) ? petriNet.edges : [];
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const validEdges = edges.filter((edge) =>
      nodeById.has(edge.source) && nodeById.has(edge.target)
    );
    const incomingByNodeId = new Map(nodes.map((node) => [node.id, []]));
    const outgoingByNodeId = new Map(nodes.map((node) => [node.id, []]));
    const directedAdjacency = new Map(nodes.map((node) => [node.id, new Set()]));

    for (const edge of validEdges) {
      incomingByNodeId.get(edge.target).push(edge);
      outgoingByNodeId.get(edge.source).push(edge);
      directedAdjacency.get(edge.source).add(edge.target);
    }

    return {
      nodes,
      edges: validEdges,
      nodeById,
      incomingByNodeId,
      outgoingByNodeId,
      directedAdjacency,
      strongComponents: this.findStrongComponents(nodes, directedAdjacency)
    };
  }

  findStrongComponents(nodes, adjacency) {
    const indexByNodeId = new Map();
    const lowByNodeId = new Map();
    const stack = [];
    const stackedNodeIds = new Set();
    const components = [];
    let index = 0;

    const visit = (nodeId) => {
      indexByNodeId.set(nodeId, index);
      lowByNodeId.set(nodeId, index);
      index += 1;
      stack.push(nodeId);
      stackedNodeIds.add(nodeId);

      for (const nextNodeId of adjacency.get(nodeId) || []) {
        if (!indexByNodeId.has(nextNodeId)) {
          visit(nextNodeId);
          lowByNodeId.set(nodeId, Math.min(lowByNodeId.get(nodeId), lowByNodeId.get(nextNodeId)));
          continue;
        }

        if (stackedNodeIds.has(nextNodeId)) {
          lowByNodeId.set(nodeId, Math.min(lowByNodeId.get(nodeId), indexByNodeId.get(nextNodeId)));
        }
      }

      if (lowByNodeId.get(nodeId) !== indexByNodeId.get(nodeId)) {
        return;
      }

      const nodeIds = [];
      let currentNodeId = null;

      do {
        currentNodeId = stack.pop();
        stackedNodeIds.delete(currentNodeId);
        nodeIds.push(currentNodeId);
      } while (currentNodeId !== nodeId);

      components.push({
        id: `scc-${components.length}`,
        nodeIds: nodeIds.sort((a, b) => String(a).localeCompare(String(b)))
      });
    };

    for (const node of nodes) {
      if (!indexByNodeId.has(node.id)) {
        visit(node.id);
      }
    }

    return components;
  }
}

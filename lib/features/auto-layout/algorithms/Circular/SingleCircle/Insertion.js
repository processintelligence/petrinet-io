export default class Insertion {

  insert(petriNet) {
    const circularOrder = Array.isArray(petriNet.circularOrder)
      ? [...petriNet.circularOrder]
      : [];
    const orderingAdjacency = this.buildUndirectedAdjacency(
      petriNet.circularOrderingNodes || petriNet.nodes,
      petriNet.circularOrderingEdges || petriNet.edges
    );
    const branchOrder = Array.isArray(petriNet.circularBranchOrder)
      ? [...petriNet.circularBranchOrder]
      : [];
    const fallbackNodeIds = (petriNet.circularOrderingNodes || petriNet.nodes)
      .map((node) => node.id)
      .filter((nodeId) => !circularOrder.includes(nodeId) && !branchOrder.includes(nodeId));
    const insertionNodeIds = [...branchOrder, ...fallbackNodeIds];

    for (const nodeId of insertionNodeIds) {
      const presentNeighborIds = Array.from(orderingAdjacency.get(nodeId) || [])
        .filter((neighborId) => circularOrder.includes(neighborId));

      if (presentNeighborIds.length >= 2) {
        const insertIndex = this.findBetweenNeighborsIndex(circularOrder, presentNeighborIds);

        if (insertIndex !== null) {
          circularOrder.splice(insertIndex, 0, nodeId);
          continue;
        }
      }

      if (presentNeighborIds.length >= 1) {
        const insertIndex = this.findNextToNeighborIndex(circularOrder, presentNeighborIds[0]);
        circularOrder.splice(insertIndex, 0, nodeId);
        continue;
      }

      circularOrder.push(nodeId);
    }

    return {
      ...petriNet,
      circularOrder
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

  findBetweenNeighborsIndex(circularOrder, presentNeighborIds) {
    const neighborIdSet = new Set(presentNeighborIds);

    for (let index = 0; index < circularOrder.length; index++) {
      const currentId = circularOrder[index];
      const nextIndex = (index + 1) % circularOrder.length;
      const nextId = circularOrder[nextIndex];

      if (neighborIdSet.has(currentId) && neighborIdSet.has(nextId)) {
        return nextIndex === 0 ? circularOrder.length : nextIndex;
      }
    }

    return null;
  }

  findNextToNeighborIndex(circularOrder, neighborId) {
    const neighborIndex = circularOrder.indexOf(neighborId);

    if (neighborIndex === -1) {
      return circularOrder.length;
    }

    return neighborIndex + 1;
  }
}

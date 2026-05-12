export default class SingleCircleReduction {

  reduce(petriNet) {
    const workingNodes = petriNet.nodes.map((node) => ({ ...node }));
    const workingEdges = petriNet.edges.map((edge) => ({ ...edge }));
    const removedNodes = [];
    const removalEdges = [];
    const removalEdgeIds = new Set();
    const triangulationEdges = [];
    let waveFrontNodeIds = new Set();
    let waveCenterNodeIds = new Set();
    let triangulationIndex = 0;

    while (workingNodes.length > 3) {
      const adjacency = this.buildUndirectedAdjacency(workingNodes, workingEdges);
      const currentNode = this.pickNextNode(
        workingNodes,
        adjacency,
        waveFrontNodeIds,
        waveCenterNodeIds
      );

      if (!currentNode) {
        break;
      }

      const neighborIds = Array.from(adjacency.get(currentNode.id) || []).sort((a, b) =>
        String(a).localeCompare(String(b))
      );

      this.recordNeighborPairs(
        neighborIds,
        workingEdges,
        removalEdges,
        removalEdgeIds,
        triangulationEdges,
        () => `circular-triangulation-${triangulationIndex++}`
      );

      removedNodes.push({
        node: { ...currentNode },
        neighborIds
      });

      const nextWaveCenterNodeIds = new Set();

      for (const nodeId of waveFrontNodeIds) {
        if (nodeId !== currentNode.id && !neighborIds.includes(nodeId)) {
          nextWaveCenterNodeIds.add(nodeId);
        }
      }

      for (const nodeId of waveCenterNodeIds) {
        if (nodeId !== currentNode.id && !neighborIds.includes(nodeId)) {
          nextWaveCenterNodeIds.add(nodeId);
        }
      }

      waveFrontNodeIds = new Set(neighborIds);
      waveCenterNodeIds = nextWaveCenterNodeIds;

      this.removeNode(currentNode.id, workingNodes, workingEdges);
      this.pruneNodeSet(waveFrontNodeIds, workingNodes);
      this.pruneNodeSet(waveCenterNodeIds, workingNodes);
    }

    return {
      ...petriNet,
      circularRemovedNodes: removedNodes,
      circularRemovalEdges: removalEdges,
      circularTriangulationEdges: triangulationEdges,
      circularReducedNodes: workingNodes,
      circularReducedEdges: workingEdges
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

  pickNextNode(nodes, adjacency, waveFrontNodeIds, waveCenterNodeIds) {
    const candidateNodes = this.getLowestDegreeNodes(nodes, adjacency);

    const waveFrontNode = this.pickPreferredNode(candidateNodes, waveFrontNodeIds);

    if (waveFrontNode) {
      return waveFrontNode;
    }

    const waveCenterNode = this.pickPreferredNode(candidateNodes, waveCenterNodeIds);

    if (waveCenterNode) {
      return waveCenterNode;
    }

    return candidateNodes[0] || null;
  }

  getLowestDegreeNodes(nodes, adjacency) {
    let bestDegree = Infinity;
    const candidateNodes = [];

    for (const node of nodes) {
      const degree = (adjacency.get(node.id) || new Set()).size;

      if (degree < bestDegree) {
        bestDegree = degree;
        candidateNodes.length = 0;
        candidateNodes.push(node);
        continue;
      }

      if (degree === bestDegree) {
        candidateNodes.push(node);
      }
    }

    return candidateNodes.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  }

  pickPreferredNode(candidateNodes, preferredNodeIds) {
    for (const node of candidateNodes) {
      if (preferredNodeIds.has(node.id)) {
        return node;
      }
    }

    return null;
  }

  recordNeighborPairs(
    neighborIds,
    workingEdges,
    removalEdges,
    removalEdgeIds,
    triangulationEdges,
    nextTriangulationId
  ) {
    for (let index = 0; index < neighborIds.length - 1; index++) {
      const sourceId = neighborIds[index];
      const targetId = neighborIds[index + 1];
      const pairEdge = this.findUndirectedEdge(workingEdges, sourceId, targetId);

      if (pairEdge) {
        this.addRemovalEdge(pairEdge, removalEdges, removalEdgeIds);
        continue;
      }

      const triangulationEdge = {
        id: nextTriangulationId(),
        type: "triangulation",
        source: sourceId,
        target: targetId,
        isTriangulationEdge: true
      };

      workingEdges.push(triangulationEdge);
      triangulationEdges.push({ ...triangulationEdge });
      this.addRemovalEdge(triangulationEdge, removalEdges, removalEdgeIds);
    }
  }

  findUndirectedEdge(edges, sourceId, targetId) {
    return edges.find((edge) =>
      (edge.source === sourceId && edge.target === targetId) ||
      (edge.source === targetId && edge.target === sourceId)
    );
  }

  addRemovalEdge(edge, removalEdges, removalEdgeIds) {
    if (removalEdgeIds.has(edge.id)) {
      return;
    }

    removalEdgeIds.add(edge.id);
    removalEdges.push({ ...edge });
  }

  removeNode(nodeId, workingNodes, workingEdges) {
    const nodeIndex = workingNodes.findIndex((node) => node.id === nodeId);

    if (nodeIndex >= 0) {
      workingNodes.splice(nodeIndex, 1);
    }

    for (let index = workingEdges.length - 1; index >= 0; index--) {
      const edge = workingEdges[index];

      if (edge.source === nodeId || edge.target === nodeId) {
        workingEdges.splice(index, 1);
      }
    }
  }

  pruneNodeSet(nodeIds, workingNodes) {
    const remainingNodeIds = new Set(workingNodes.map((node) => node.id));

    for (const nodeId of [...nodeIds]) {
      if (!remainingNodeIds.has(nodeId)) {
        nodeIds.delete(nodeId);
      }
    }
  }
}

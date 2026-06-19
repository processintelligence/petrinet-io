export default class Postprocessing {

  constructor() {
    this.maxIterations = 4;
  }

  optimize(petriNet) {
    let circularOrder = Array.isArray(petriNet.circularOrder)
      ? [...petriNet.circularOrder]
      : [];

    if (circularOrder.length < 4) {
      return petriNet;
    }

    const adjacency = this.buildUndirectedAdjacency(petriNet.nodes, petriNet.edges);
    let currentCrossings = this.countCrossings(circularOrder, petriNet.edges);

    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      let improved = false;

      for (const nodeId of [...circularOrder]) {
        const previousOrder = [...circularOrder];
        const currentIndex = circularOrder.indexOf(nodeId);

        if (currentIndex === -1) {
          continue;
        }

        const orderWithoutNode = [...circularOrder];
        orderWithoutNode.splice(currentIndex, 1);

        const candidateIndices = this.buildCandidateIndices(
          nodeId,
          orderWithoutNode,
          adjacency
        );

        let bestOrder = previousOrder;
        let bestCrossings = currentCrossings;

        for (const insertIndex of candidateIndices) {
          const candidateOrder = [...orderWithoutNode];
          candidateOrder.splice(insertIndex, 0, nodeId);

          const newCrossings = this.countCrossings(candidateOrder, petriNet.edges);

          if (newCrossings < bestCrossings) {
            bestCrossings = newCrossings;
            bestOrder = candidateOrder;
          }
        }

        if (bestCrossings < currentCrossings) {
          circularOrder = bestOrder;
          currentCrossings = bestCrossings;
          improved = true;
        }
      }

      if (!improved) {
        break;
      }
    }

    const positionedNodes = this.placeNodesOnCircle(
      petriNet.nodes,
      circularOrder,
      petriNet.circularCenter,
      Number.isFinite(petriNet.circularRadius)
        ? petriNet.circularRadius
        : this.getSizeAwareRadius(petriNet.nodes, circularOrder)
    );

    return {
      ...petriNet,
      circularOrder,
      nodes: positionedNodes
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

  buildCandidateIndices(nodeId, circularOrder, adjacency) {
    const neighborIds = adjacency.get(nodeId) || new Set();
    const betweenNeighborIndices = [];
    const nextToNeighborIndices = [];

    if (circularOrder.length === 0) {
      return [0];
    }

    for (let index = 0; index < circularOrder.length; index++) {
      const currentId = circularOrder[index];
      const nextIndex = (index + 1) % circularOrder.length;
      const nextId = circularOrder[nextIndex];
      const insertIndex = nextIndex === 0 ? circularOrder.length : nextIndex;

      if (neighborIds.has(currentId) && neighborIds.has(nextId)) {
        betweenNeighborIndices.push(insertIndex);
      } else if (neighborIds.has(currentId) || neighborIds.has(nextId)) {
        nextToNeighborIndices.push(insertIndex);
      }
    }

    if (betweenNeighborIndices.length > 0) {
      return [...new Set(betweenNeighborIndices)];
    }

    if (nextToNeighborIndices.length > 0) {
      return [...new Set(nextToNeighborIndices)];
    }

    return [circularOrder.length];
  }

  countCrossings(circularOrder, edges) {
    const positions = new Map();

    circularOrder.forEach((nodeId, index) => {
      positions.set(nodeId, index);
    });

    const usableEdges = edges.filter((edge) =>
      positions.has(edge.source) &&
      positions.has(edge.target) &&
      edge.source !== edge.target
    );

    let crossings = 0;

    for (let i = 0; i < usableEdges.length; i++) {
      for (let j = i + 1; j < usableEdges.length; j++) {
        const edgeA = usableEdges[i];
        const edgeB = usableEdges[j];

        if (
          edgeA.source === edgeB.source ||
          edgeA.source === edgeB.target ||
          edgeA.target === edgeB.source ||
          edgeA.target === edgeB.target
        ) {
          continue;
        }

        let aStart = positions.get(edgeA.source);
        let aEnd = positions.get(edgeA.target);
        let bStart = positions.get(edgeB.source);
        let bEnd = positions.get(edgeB.target);

        if (aStart > aEnd) {
          [aStart, aEnd] = [aEnd, aStart];
        }

        if (bStart > bEnd) {
          [bStart, bEnd] = [bEnd, bStart];
        }

        const crosses =
          (aStart < bStart && bStart < aEnd && aEnd < bEnd) ||
          (bStart < aStart && aStart < bEnd && bEnd < aEnd);

        if (crosses) {
          crossings += 1;
        }
      }
    }

    return crossings;
  }

  placeNodesOnCircle(nodes, circularOrder, center, radius) {
    if (!center || !Number.isFinite(radius) || circularOrder.length === 0) {
      return nodes.map((node) => ({ ...node }));
    }

    const nodeById = new Map(nodes.map((node) => [node.id, { ...node }]));
    const nodeGap = 60;

    this.getSizeAwareAngles(circularOrder, nodeById, radius, nodeGap).forEach(({ nodeId, angle }) => {
      const node = nodeById.get(nodeId);

      if (!node) {
        return;
      }

      const centerNodeX = center.x + radius * Math.cos(angle);
      const centerNodeY = center.y + radius * Math.sin(angle);

      node.x = centerNodeX - this.getNodeWidth(node) / 2;
      node.y = centerNodeY - this.getNodeHeight(node) / 2;
    });

    return nodes.map((node) => nodeById.get(node.id) || { ...node });
  }

  getSizeAwareAngles(circularOrder, nodeById, radius, nodeGap) {
    const startAngle = -Math.PI / 2;

    if (circularOrder.length === 1) {
      return [{ nodeId: circularOrder[0], angle: startAngle }];
    }

    const angles = [];
    let angle = startAngle;

    circularOrder.forEach((nodeId, index) => {
      angles.push({ nodeId, angle });

      const node = nodeById.get(nodeId);
      const nextNodeId = circularOrder[(index + 1) % circularOrder.length];
      const nextNode = nodeById.get(nextNodeId);

      if (!node || !nextNode || index === circularOrder.length - 1) {
        return;
      }

      angle += this.getCenterArcLength(node, nextNode, nodeGap) / radius;
    });

    return angles;
  }

  getSizeAwareRadius(nodes, circularOrder) {
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const nodeGap = 60;
    const circumference = circularOrder.reduce((sum, nodeId) => {
      const node = nodeById.get(nodeId);

      return sum + (node ? this.getNodeDiameter(node) + nodeGap : 0);
    }, 0);

    return Math.max(150, circumference / (2 * Math.PI));
  }

  getNodeDiameter(node) {
    return Math.max(40, Math.hypot(this.getNodeWidth(node), this.getNodeHeight(node)));
  }

  getCenterArcLength(node, nextNode, nodeGap) {
    return this.getNodeDiameter(node) / 2 + this.getNodeDiameter(nextNode) / 2 + nodeGap;
  }

  getNodeHeight(node) {
    return Number.isFinite(node?.height) && node.height > 0 ? node.height : 0;
  }

  getNodeWidth(node) {
    return Number.isFinite(node?.width) && node.width > 0 ? node.width : 0;
  }
}

export default class Decomposition {

  decompose(petriNet) {
    return {
      ...petriNet,
      circularDecomposition: this.buildDecomposition(petriNet)
    };
  }

  buildDecomposition(petriNet) {
    const nodes = Array.isArray(petriNet.nodes) ? petriNet.nodes : [];
    const edges = Array.isArray(petriNet.edges) ? petriNet.edges : [];
    const nodeIds = nodes.map((node) => node.id);
    const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
    const adjacency = this.buildUndirectedAdjacency(nodeIds, edges);
    const discoveryByNodeId = new Map();
    const lowByNodeId = new Map();
    const articulationNodeIds = new Set();
    const edgeStack = [];
    const blocks = [];
    let discoveryIndex = 0;
    let blockIndex = 0;

    const popBlock = (stopEdgeId) => {
      const edgeIds = [];

      while (edgeStack.length > 0) {
        const edgeId = edgeStack.pop();
        edgeIds.push(edgeId);

        if (edgeId === stopEdgeId) {
          break;
        }
      }

      if (edgeIds.length === 0) {
        return;
      }

      const blockNodeIds = new Set();

      for (const edgeId of edgeIds) {
        const edge = edgeById.get(edgeId);

        if (!edge) {
          continue;
        }

        blockNodeIds.add(edge.source);
        blockNodeIds.add(edge.target);
      }

      blocks.push({
        id: `circular-block-${blockIndex++}`,
        nodeIds: [...blockNodeIds].sort((a, b) => String(a).localeCompare(String(b))),
        edgeIds
      });
    };

    const visitNode = (nodeId, parentEdgeId = null) => {
      discoveryIndex += 1;
      discoveryByNodeId.set(nodeId, discoveryIndex);
      lowByNodeId.set(nodeId, discoveryIndex);
      let childCount = 0;

      const neighbors = [...(adjacency.get(nodeId) || [])].sort((a, b) =>
        String(a.neighborId).localeCompare(String(b.neighborId))
      );

      for (const { edgeId, neighborId } of neighbors) {
        if (edgeId === parentEdgeId) {
          continue;
        }

        if (!discoveryByNodeId.has(neighborId)) {
          childCount += 1;
          edgeStack.push(edgeId);
          visitNode(neighborId, edgeId);

          lowByNodeId.set(
            nodeId,
            Math.min(lowByNodeId.get(nodeId), lowByNodeId.get(neighborId))
          );

          const separatesGraph = parentEdgeId === null
            ? childCount > 1
            : lowByNodeId.get(neighborId) >= discoveryByNodeId.get(nodeId);

          if (separatesGraph) {
            articulationNodeIds.add(nodeId);
          }

          if (lowByNodeId.get(neighborId) >= discoveryByNodeId.get(nodeId)) {
            popBlock(edgeId);
          }

          continue;
        }

        if (discoveryByNodeId.get(neighborId) < discoveryByNodeId.get(nodeId)) {
          edgeStack.push(edgeId);
          lowByNodeId.set(
            nodeId,
            Math.min(lowByNodeId.get(nodeId), discoveryByNodeId.get(neighborId))
          );
        }
      }
    };

    for (const nodeId of [...nodeIds].sort((a, b) => String(a).localeCompare(String(b)))) {
      if (discoveryByNodeId.has(nodeId)) {
        continue;
      }

      visitNode(nodeId);

      if (edgeStack.length > 0) {
        popBlock(edgeStack[edgeStack.length - 1]);
      }
    }

    const coveredNodeIds = new Set();

    for (const block of blocks) {
      for (const nodeId of block.nodeIds) {
        coveredNodeIds.add(nodeId);
      }
    }

    for (const nodeId of nodeIds) {
      if (coveredNodeIds.has(nodeId)) {
        continue;
      }

      blocks.push({
        id: `circular-block-${blockIndex++}`,
        nodeIds: [nodeId],
        edgeIds: []
      });
    }

    const blockIdsByNodeId = this.buildBlockIdsByNodeId(blocks);
    const blockAdjacency = this.buildBlockAdjacency(blocks, blockIdsByNodeId, articulationNodeIds);

    return {
      blocks,
      articulationNodeIds: [...articulationNodeIds].sort((a, b) => String(a).localeCompare(String(b))),
      blockIdsByNodeId,
      blockAdjacency
    };
  }

  buildUndirectedAdjacency(nodeIds, edges) {
    const adjacency = new Map();

    for (const nodeId of nodeIds) {
      adjacency.set(nodeId, []);
    }

    for (const edge of edges) {
      if (!adjacency.has(edge.source) || !adjacency.has(edge.target) || edge.source === edge.target) {
        continue;
      }

      adjacency.get(edge.source).push({ edgeId: edge.id, neighborId: edge.target });
      adjacency.get(edge.target).push({ edgeId: edge.id, neighborId: edge.source });
    }

    return adjacency;
  }

  buildBlockIdsByNodeId(blocks) {
    const blockIdsByNodeId = new Map();

    for (const block of blocks) {
      for (const nodeId of block.nodeIds) {
        if (!blockIdsByNodeId.has(nodeId)) {
          blockIdsByNodeId.set(nodeId, []);
        }

        blockIdsByNodeId.get(nodeId).push(block.id);
      }
    }

    return blockIdsByNodeId;
  }

  buildBlockAdjacency(blocks, blockIdsByNodeId, articulationNodeIds) {
    const blockAdjacency = new Map();

    for (const block of blocks) {
      blockAdjacency.set(block.id, new Set());
    }

    for (const articulationNodeId of articulationNodeIds) {
      const blockIds = [...(blockIdsByNodeId.get(articulationNodeId) || [])]
        .sort((a, b) => String(a).localeCompare(String(b)));

      for (let index = 0; index < blockIds.length; index++) {
        for (let nextIndex = index + 1; nextIndex < blockIds.length; nextIndex++) {
          blockAdjacency.get(blockIds[index]).add(blockIds[nextIndex]);
          blockAdjacency.get(blockIds[nextIndex]).add(blockIds[index]);
        }
      }
    }

    return blockAdjacency;
  }
}

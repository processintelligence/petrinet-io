export default class Preparation {

  prepare(petriNet) {
    const decomposition = petriNet.circularDecomposition;

    if (!decomposition || decomposition.blocks.length === 0) {
      return petriNet;
    }

    const parentInfoByBlockId = this.buildParentInfo(decomposition);

    return {
      ...petriNet,
      circularParentInfoByBlockId: parentInfoByBlockId,
      circularOwnerBlockIdByNodeId: this.assignOwnerBlocks(decomposition, parentInfoByBlockId)
    };
  }

  buildParentInfo(decomposition) {
    const parentInfoByBlockId = new Map();
    const visitedBlockIds = new Set();
    const rootBlockIds = [...decomposition.blocks]
      .sort((blockA, blockB) => {
        const sizeDelta = blockB.nodeIds.length - blockA.nodeIds.length;

        if (sizeDelta !== 0) {
          return sizeDelta;
        }

        return String(blockA.id).localeCompare(String(blockB.id));
      })
      .map((block) => block.id);

    for (const rootBlockId of rootBlockIds) {
      if (visitedBlockIds.has(rootBlockId)) {
        continue;
      }

      const stack = [rootBlockId];

      visitedBlockIds.add(rootBlockId);
      parentInfoByBlockId.set(rootBlockId, {
        parentBlockId: null,
        articulationNodeId: null,
        childBlockIds: []
      });

      while (stack.length > 0) {
        const blockId = stack.pop();
        const block = decomposition.blocks.find((candidate) => candidate.id === blockId);

        if (!block) {
          continue;
        }

        for (const articulationNodeId of this.getBlockArticulations(block, decomposition)) {
          const childBlockIds = [...(decomposition.blockIdsByNodeId.get(articulationNodeId) || [])]
            .filter((childBlockId) => childBlockId !== blockId && !visitedBlockIds.has(childBlockId))
            .sort((childBlockIdA, childBlockIdB) => String(childBlockIdA).localeCompare(String(childBlockIdB)));

          for (const childBlockId of childBlockIds) {
            visitedBlockIds.add(childBlockId);
            parentInfoByBlockId.set(childBlockId, {
              parentBlockId: blockId,
              articulationNodeId,
              childBlockIds: []
            });
            parentInfoByBlockId.get(blockId).childBlockIds.push(childBlockId);
            stack.push(childBlockId);
          }
        }
      }
    }

    return parentInfoByBlockId;
  }

  getBlockArticulations(block, decomposition) {
    const articulationNodeIdSet = new Set(decomposition.articulationNodeIds);

    return block.nodeIds
      .filter((nodeId) => articulationNodeIdSet.has(nodeId))
      .sort((nodeIdA, nodeIdB) => String(nodeIdA).localeCompare(String(nodeIdB)));
  }

  assignOwnerBlocks(decomposition, parentInfoByBlockId) {
    const depthByBlockId = this.computeDepths(parentInfoByBlockId);
    const ownerBlockIdByNodeId = new Map();

    for (const [nodeId, blockIds] of decomposition.blockIdsByNodeId) {
      const ownerBlockId = [...blockIds].sort((blockIdA, blockIdB) => {
        const depthDelta = (depthByBlockId.get(blockIdA) || 0) - (depthByBlockId.get(blockIdB) || 0);

        if (depthDelta !== 0) {
          return depthDelta;
        }

        return String(blockIdA).localeCompare(String(blockIdB));
      })[0];

      ownerBlockIdByNodeId.set(nodeId, ownerBlockId);
    }

    return ownerBlockIdByNodeId;
  }

  computeDepths(parentInfoByBlockId) {
    const depthByBlockId = new Map();
    const rootBlockIds = [...parentInfoByBlockId.entries()]
      .filter(([, info]) => info.parentBlockId === null)
      .map(([blockId]) => blockId);
    const stack = rootBlockIds.map((blockId) => ({ blockId, depth: 0 }));

    while (stack.length > 0) {
      const { blockId, depth } = stack.pop();
      depthByBlockId.set(blockId, depth);

      for (const childBlockId of parentInfoByBlockId.get(blockId)?.childBlockIds || []) {
        stack.push({ blockId: childBlockId, depth: depth + 1 });
      }
    }

    return depthByBlockId;
  }
}

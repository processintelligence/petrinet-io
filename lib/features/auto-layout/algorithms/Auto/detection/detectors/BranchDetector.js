export default class BranchDetector {

  detect(context) {
    const regions = [];

    for (const node of context.analysis.nodes) {
      const outgoing = context.analysis.outgoingByNodeId.get(node.id) || [];

      if (outgoing.length < 2) {
        continue;
      }

      const pathStartNodeIds = outgoing
        .map((edge) => edge.target);

      if (pathStartNodeIds.length < 2) {
        continue;
      }

      const exitNodeId = this.findJoinNode(context, pathStartNodeIds);
      const nodeIds = this.collectBranchNodeIds(context, node.id, pathStartNodeIds, exitNodeId);
      const joinInfo = this.detectJoinInfo(context, node.id, pathStartNodeIds, nodeIds, exitNodeId);

      regions.push({
        type: "branch",
        algorithm: "sugiyama",
        entryNodeId: node.id,
        exitNodeId,
        joinNodeIds: joinInfo.joinNodeIds,
        parentJoinNodeIds: joinInfo.parentJoinNodeIds,
        pathStartNodeIds,
        nodeIds,
        edgeIds: context.edgeIdsInside(nodeIds)
      });
    }

    return regions;
  }

  findJoinNode(context, pathStartNodeIds) {
    const reachability = pathStartNodeIds.map((nodeId) =>
      this.distanceByReachableNodeId(context, nodeId)
    );
    const commonNodeIds = [...reachability[0].keys()]
      .filter((nodeId) =>
        reachability.every((reachable) => reachable.has(nodeId))
      );

    commonNodeIds.sort((a, b) => {
      const distanceA = Math.max(...reachability.map((reachable) => reachable.get(a)));
      const distanceB = Math.max(...reachability.map((reachable) => reachable.get(b)));

      return distanceA - distanceB || String(a).localeCompare(String(b));
    });

    return commonNodeIds[0] || null;
  }

  distanceByReachableNodeId(context, startNodeId) {
    const distances = new Map([[startNodeId, 0]]);
    const queue = [startNodeId];

    while (queue.length > 0) {
      const nodeId = queue.shift();

      for (const edge of context.analysis.outgoingByNodeId.get(nodeId) || []) {
        if (distances.has(edge.target)) {
          continue;
        }

        distances.set(edge.target, distances.get(nodeId) + 1);
        queue.push(edge.target);
      }
    }

    return distances;
  }

  collectBranchNodeIds(context, entryNodeId, pathStartNodeIds, exitNodeId) {
    const nodeIds = new Set([entryNodeId]);
    const stack = [...pathStartNodeIds];

    while (stack.length > 0) {
      const nodeId = stack.pop();

      if (!nodeId || nodeIds.has(nodeId)) {
        continue;
      }

      nodeIds.add(nodeId);

      if (nodeId === exitNodeId) {
        continue;
      }

      for (const edge of context.analysis.outgoingByNodeId.get(nodeId) || []) {
        stack.push(edge.target);
      }
    }

    return [...nodeIds].sort((a, b) => String(a).localeCompare(String(b)));
  }

  detectJoinInfo(context, entryNodeId, pathStartNodeIds, nodeIds, exitNodeId) {
    const nodeIdSet = new Set(nodeIds);
    const reachablePathStartsByNodeId = new Map();

    for (const pathStartNodeId of pathStartNodeIds) {
      for (const nodeId of this.reachableNodeIdsInsideRegion(context, pathStartNodeId, nodeIdSet)) {
        if (!reachablePathStartsByNodeId.has(nodeId)) {
          reachablePathStartsByNodeId.set(nodeId, new Set());
        }

        reachablePathStartsByNodeId.get(nodeId).add(pathStartNodeId);
      }
    }

    const joinNodeIds = [];
    const parentJoinNodeIds = [];
    const parentLaneCount = pathStartNodeIds.length;

    for (const nodeId of nodeIds) {
      if (nodeId === entryNodeId) {
        continue;
      }

      const internalIncomingCount = (context.analysis.incomingByNodeId.get(nodeId) || [])
        .filter((edge) => nodeIdSet.has(edge.source))
        .length;
      const reachingPathStartCount = reachablePathStartsByNodeId.get(nodeId)?.size || 0;

      if (nodeId === exitNodeId || (internalIncomingCount > 1 && reachingPathStartCount > 1)) {
        joinNodeIds.push(nodeId);
      }

      if (nodeId === exitNodeId ||
        (internalIncomingCount > 1 && reachingPathStartCount === parentLaneCount)) {
        parentJoinNodeIds.push(nodeId);
      }
    }

    return {
      joinNodeIds: this.uniqueSortedNodeIds(joinNodeIds),
      parentJoinNodeIds: this.uniqueSortedNodeIds(parentJoinNodeIds)
    };
  }

  uniqueSortedNodeIds(nodeIds) {
    return [...new Set(nodeIds)]
      .sort((first, second) => String(first).localeCompare(String(second)));
  }

  reachableNodeIdsInsideRegion(context, startNodeId, nodeIdSet) {
    const reachableNodeIds = new Set();
    const queue = [startNodeId];

    while (queue.length > 0) {
      const nodeId = queue.shift();

      if (!nodeId || reachableNodeIds.has(nodeId) || !nodeIdSet.has(nodeId)) {
        continue;
      }

      reachableNodeIds.add(nodeId);

      for (const edge of context.analysis.outgoingByNodeId.get(nodeId) || []) {
        if (nodeIdSet.has(edge.target) && !reachableNodeIds.has(edge.target)) {
          queue.push(edge.target);
        }
      }
    }

    return reachableNodeIds;
  }
}

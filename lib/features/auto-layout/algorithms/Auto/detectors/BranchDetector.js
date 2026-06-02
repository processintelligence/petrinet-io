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

      regions.push({
        type: "branch",
        algorithm: "sugiyama",
        entryNodeId: node.id,
        exitNodeId,
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
}

function byId(first, second) {
  return String(first.id).localeCompare(String(second.id));
}

export function analyzeGraph(layout) {
  const nodes = [...layout.nodes].sort(byId);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edges = layout.edges
    .filter((edge) => nodeById.has(edge.source) && nodeById.has(edge.target))
    .sort(byId);
  const incomingByNodeId = new Map(nodes.map((node) => [node.id, []]));
  const outgoingByNodeId = new Map(nodes.map((node) => [node.id, []]));

  for (const edge of edges) {
    incomingByNodeId.get(edge.target).push(edge);
    outgoingByNodeId.get(edge.source).push(edge);
  }

  for (const edgeList of [...incomingByNodeId.values(), ...outgoingByNodeId.values()]) {
    edgeList.sort((first, second) => (
      String(first.target).localeCompare(String(second.target)) || byId(first, second)
    ));
  }

  return { nodes, edges, nodeById, incomingByNodeId, outgoingByNodeId };
}

function reachableDistances(analysis, startNodeId, blockedNodeId) {
  const distances = new Map([[startNodeId, 0]]);
  const queue = [startNodeId];

  while (queue.length > 0) {
    const nodeId = queue.shift();

    for (const edge of analysis.outgoingByNodeId.get(nodeId) || []) {
      if (edge.target === blockedNodeId || distances.has(edge.target)) {
        continue;
      }

      distances.set(edge.target, distances.get(nodeId) + 1);
      queue.push(edge.target);
    }
  }

  return distances;
}

function shortestPath(analysis, startNodeId, targetNodeId, blockedNodeId) {
  const previousByNodeId = new Map([[startNodeId, null]]);
  const queue = [startNodeId];

  while (queue.length > 0) {
    const nodeId = queue.shift();

    if (nodeId === targetNodeId) {
      break;
    }

    for (const edge of analysis.outgoingByNodeId.get(nodeId) || []) {
      if (edge.target === blockedNodeId || previousByNodeId.has(edge.target)) {
        continue;
      }

      previousByNodeId.set(edge.target, nodeId);
      queue.push(edge.target);
    }
  }

  if (!previousByNodeId.has(targetNodeId)) {
    return null;
  }

  const path = [];
  let currentNodeId = targetNodeId;

  while (currentNodeId !== null) {
    path.push(currentNodeId);
    currentNodeId = previousByNodeId.get(currentNodeId);
  }

  return path.reverse();
}

export function findBranchBlocks(analysis) {
  const blocks = [];

  for (const split of analysis.nodes) {
    const branchStartNodeIds = [...new Set(
      (analysis.outgoingByNodeId.get(split.id) || []).map((edge) => edge.target)
    )].sort((first, second) => String(first).localeCompare(String(second)));

    if (branchStartNodeIds.length < 2) {
      continue;
    }

    const reachability = branchStartNodeIds.map(
      (nodeId) => reachableDistances(analysis, nodeId, split.id)
    );
    const commonJoinNodeIds = [...reachability[0].keys()]
      .filter((nodeId) => (
        nodeId !== split.id &&
        reachability.every((reachable) => reachable.has(nodeId)) &&
        (analysis.incomingByNodeId.get(nodeId) || []).length > 1
      ))
      .sort((first, second) => {
        const firstMaximum = Math.max(...reachability.map((reachable) => reachable.get(first)));
        const secondMaximum = Math.max(...reachability.map((reachable) => reachable.get(second)));
        const firstTotal = reachability.reduce((sum, reachable) => sum + reachable.get(first), 0);
        const secondTotal = reachability.reduce((sum, reachable) => sum + reachable.get(second), 0);

        return firstMaximum - secondMaximum ||
          firstTotal - secondTotal ||
          String(first).localeCompare(String(second));
      });
    const joinNodeId = commonJoinNodeIds[0];

    if (!joinNodeId) {
      continue;
    }

    const branchPaths = branchStartNodeIds.map(
      (startNodeId) => shortestPath(analysis, startNodeId, joinNodeId, split.id)
    );

    if (branchPaths.some((path) => !path || path.length < 2)) {
      continue;
    }

    blocks.push({
      splitNodeId: split.id,
      joinNodeId,
      branchPaths,
      firstNodeIds: branchPaths.map((path) => path[0]),
      lastNodeIds: branchPaths.map((path) => path.at(-2)),
      nodeIds: [...new Set([split.id, ...branchPaths.flat()])]
        .sort((first, second) => String(first).localeCompare(String(second)))
    });
  }

  return blocks;
}

export function findSimpleDirectedCycles(analysis) {
  const cycles = [];
  const cycleKeys = new Set();

  function walk(startNodeId, nodeId, nodePath, edgePath, visitedNodeIds) {
    for (const edge of analysis.outgoingByNodeId.get(nodeId) || []) {
      if (edge.target === startNodeId && nodePath.length >= 3) {
        const key = nodePath.join(">");

        if (!cycleKeys.has(key)) {
          cycleKeys.add(key);
          cycles.push({
            nodeIds: [...nodePath],
            edgeIds: [...edgePath, edge.id]
          });
        }
        continue;
      }

      if (
        visitedNodeIds.has(edge.target) ||
        String(edge.target).localeCompare(String(startNodeId)) < 0
      ) {
        continue;
      }

      visitedNodeIds.add(edge.target);
      nodePath.push(edge.target);
      edgePath.push(edge.id);
      walk(startNodeId, edge.target, nodePath, edgePath, visitedNodeIds);
      edgePath.pop();
      nodePath.pop();
      visitedNodeIds.delete(edge.target);
    }
  }

  for (const node of analysis.nodes) {
    walk(node.id, node.id, [node.id], [], new Set([node.id]));
  }

  return cycles;
}

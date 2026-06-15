export default class LayoutGraph {

  buildSubgraph(petriNet, nodeIds) {
    return {
      nodes: (petriNet.nodes || [])
        .filter((node) => nodeIds.has(node.id))
        .map((node) => ({ ...node })),
      edges: (petriNet.edges || [])
        .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
        .map((edge) => ({ ...edge }))
    };
  }

  buildOutgoingByNodeId(petriNet) {
    const outgoingByNodeId = new Map(
      (petriNet.nodes || []).map((node) => [node.id, []])
    );

    for (const edge of petriNet.edges || []) {
      if (!outgoingByNodeId.has(edge.source)) {
        continue;
      }

      outgoingByNodeId.get(edge.source).push(edge);
    }

    return outgoingByNodeId;
  }

  buildIncomingByNodeId(petriNet) {
    const incomingByNodeId = new Map(
      (petriNet.nodes || []).map((node) => [node.id, []])
    );

    for (const edge of petriNet.edges || []) {
      if (!incomingByNodeId.has(edge.target)) {
        continue;
      }

      incomingByNodeId.get(edge.target).push(edge);
    }

    return incomingByNodeId;
  }

  buildLayoutByNodeId(layouts) {
    const layoutByNodeId = new Map();

    for (const layout of layouts) {
      for (const nodeId of layout.nodeIds || []) {
        layoutByNodeId.set(nodeId, layout);
      }
    }

    return layoutByNodeId;
  }

  layoutsForNodeIds(nodeIds, layoutByNodeId) {
    const layouts = [];
    const seenLayouts = new Set();

    for (const nodeId of nodeIds || []) {
      const layout = layoutByNodeId.get(nodeId);

      if (!layout || seenLayouts.has(layout)) {
        continue;
      }

      seenLayouts.add(layout);
      layouts.push(layout);
    }

    return layouts;
  }

  successorsOutsideLayout(layout, outgoingByNodeId, regionNodeIds) {
    const layoutNodeIds = new Set(layout.nodeIds || []);
    const successorNodeIds = new Set();

    for (const nodeId of layoutNodeIds) {
      for (const edge of outgoingByNodeId.get(nodeId) || []) {
        if (regionNodeIds.has(edge.target) && !layoutNodeIds.has(edge.target)) {
          successorNodeIds.add(edge.target);
        }
      }
    }

    return [...successorNodeIds].sort((first, second) => String(first).localeCompare(String(second)));
  }
}

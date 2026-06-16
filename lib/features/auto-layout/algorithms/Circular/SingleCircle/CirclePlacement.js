export default class CirclePlacement {

  place(petriNet) {
    const circularOrder = this.buildCircularOrder(petriNet);

    if (circularOrder.length === 0) {
      return petriNet;
    }

    const nodeById = new Map(
      petriNet.nodes.map((node) => [node.id, { ...node }])
    );

    const maxNodeSize = Math.max(
      ...petriNet.nodes.map((node) => Math.max(node.width || 0, node.height || 0)),
      40
    );
    const nodeGap = 60;
    const radius = Math.max(150, (circularOrder.length * (maxNodeSize + nodeGap)) / (2 * Math.PI));
    const centerX = radius + maxNodeSize + 100;
    const centerY = radius + maxNodeSize + 100;
    const angleStep = (2 * Math.PI) / circularOrder.length;
    const startAngle = -Math.PI / 2;

    circularOrder.forEach((nodeId, index) => {
      const node = nodeById.get(nodeId);

      if (!node) {
        return;
      }

      const angle = startAngle + index * angleStep;
      const centerNodeX = centerX + radius * Math.cos(angle);
      const centerNodeY = centerY + radius * Math.sin(angle);

      node.x = centerNodeX - node.width / 2;
      node.y = centerNodeY - node.height / 2;
    });

    return {
      ...petriNet,
      circularOrder,
      circularCenter: { x: centerX, y: centerY },
      circularRadius: radius,
      nodes: petriNet.nodes.map((node) => nodeById.get(node.id) || { ...node })
    };
  }

  buildCircularOrder(petriNet) {
    const order = Array.isArray(petriNet.circularOrder)
      ? [...petriNet.circularOrder]
      : [];

    const presentNodeIds = new Set(order);

    for (const node of petriNet.nodes) {
      if (!presentNodeIds.has(node.id)) {
        order.push(node.id);
      }
    }

    return order;
  }
}

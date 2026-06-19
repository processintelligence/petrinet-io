export default class CirclePlacement {

  place(petriNet) {
    const circularOrder = this.buildCircularOrder(petriNet);

    if (circularOrder.length === 0) {
      return petriNet;
    }

    const nodeById = new Map(
      petriNet.nodes.map((node) => [node.id, { ...node }])
    );

    const nodeGap = 60;
    const orderedNodes = circularOrder
      .map((nodeId) => nodeById.get(nodeId))
      .filter((node) => node);
    const maxNodeRadius = Math.max(
      ...orderedNodes.map((node) => this.getNodeRadius(node)),
      20
    );
    const circumference = orderedNodes.reduce((sum, node) => (
      sum + this.getNodeDiameter(node) + nodeGap
    ), 0);
    const radius = Math.max(150, circumference / (2 * Math.PI));
    const centerX = radius + maxNodeRadius + 100;
    const centerY = radius + maxNodeRadius + 100;

    this.getSizeAwareAngles(circularOrder, nodeById, radius, nodeGap).forEach(({ nodeId, angle }) => {
      const node = nodeById.get(nodeId);

      if (!node) {
        return;
      }

      const centerNodeX = centerX + radius * Math.cos(angle);
      const centerNodeY = centerY + radius * Math.sin(angle);

      node.x = centerNodeX - this.getNodeWidth(node) / 2;
      node.y = centerNodeY - this.getNodeHeight(node) / 2;
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

  getCenterArcLength(node, nextNode, nodeGap) {
    return this.getNodeDiameter(node) / 2 + this.getNodeDiameter(nextNode) / 2 + nodeGap;
  }

  getNodeDiameter(node) {
    return Math.max(40, 2 * this.getNodeRadius(node));
  }

  getNodeRadius(node) {
    return Math.hypot(this.getNodeWidth(node), this.getNodeHeight(node)) / 2;
  }

  getNodeHeight(node) {
    return Number.isFinite(node?.height) && node.height > 0 ? node.height : 0;
  }

  getNodeWidth(node) {
    return Number.isFinite(node?.width) && node.width > 0 ? node.width : 0;
  }
}

export default class Composition {

  compose(petriNet) {
    const decomposition = petriNet.circularDecomposition;
    const ownerBlockIdByNodeId = petriNet.circularOwnerBlockIdByNodeId;
    const blockLayoutById = petriNet.circularBlockLayoutById;
    const transformsByBlockId = petriNet.circularTransformsByBlockId;

    if (!decomposition || !ownerBlockIdByNodeId || !blockLayoutById || !transformsByBlockId) {
      return petriNet;
    }

    const outputNodeById = new Map(petriNet.nodes.map((node) => [node.id, { ...node }]));

    for (const block of decomposition.blocks) {
      const blockLayout = blockLayoutById.get(block.id);
      const transform = transformsByBlockId.get(block.id);

      if (!blockLayout || !transform || !blockLayout.circularCenter) {
        continue;
      }

      for (const node of blockLayout.nodes) {
        if (ownerBlockIdByNodeId.get(node.id) !== block.id) {
          continue;
        }

        const outputNode = outputNodeById.get(node.id);

        if (!outputNode) {
          continue;
        }

        const localCenter = {
          x: node.x + node.width / 2,
          y: node.y + node.height / 2
        };
        const relative = {
          x: localCenter.x - blockLayout.circularCenter.x,
          y: localCenter.y - blockLayout.circularCenter.y
        };
        const rotated = this.rotate(relative, transform.rotation);
        const globalCenter = {
          x: transform.center.x + rotated.x,
          y: transform.center.y + rotated.y
        };

        outputNode.x = globalCenter.x - outputNode.width / 2;
        outputNode.y = globalCenter.y - outputNode.height / 2;
      }
    }

    return {
      ...petriNet,
      nodes: petriNet.nodes.map((node) => outputNodeById.get(node.id) || { ...node }),
      circularBlocks: decomposition.blocks,
      circularArticulationNodeIds: decomposition.articulationNodeIds
    };
  }

  rotate(point, angle) {
    return {
      x: point.x * Math.cos(angle) - point.y * Math.sin(angle),
      y: point.x * Math.sin(angle) + point.y * Math.cos(angle)
    };
  }
}

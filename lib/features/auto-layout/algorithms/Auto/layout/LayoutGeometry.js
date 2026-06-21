export default class LayoutGeometry {

  constructor() {
    this.padding = 40;
    this.minimumBlockSize = 80;
    this.blockHorizontalGap = 90;
    this.blockVerticalGap = 60;
    this.boundaryNodeGap = 70;
  }

  normalizeNodes(nodes) {
    if (nodes.length === 0) {
      return {
        nodes: [],
        bounds: {
          width: this.minimumBlockSize,
          height: this.minimumBlockSize
        }
      };
    }

    const bounds = this.getBounds(nodes);
    const normalizedNodes = nodes.map((node) => ({
      ...node,
      x: node.x - bounds.minX + this.padding,
      y: node.y - bounds.minY + this.padding
    }));

    return {
      nodes: normalizedNodes,
      bounds: {
        width: Math.max(this.minimumBlockSize, bounds.width + this.padding * 2),
        height: Math.max(this.minimumBlockSize, bounds.height + this.padding * 2)
      }
    };
  }

  getBounds(nodes) {
    const minX = Math.min(...nodes.map((node) => node.x));
    const minY = Math.min(...nodes.map((node) => node.y));
    const maxX = Math.max(...nodes.map((node) => node.x + (node.width || 0)));
    const maxY = Math.max(...nodes.map((node) => node.y + (node.height || 0)));

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  buildLayout(region, nodes, nodeIds, bounds) {
    const layout = {
      id: region.id || `${region.type}-${[...nodeIds].join("-")}`,
      type: region.type,
      algorithm: region.algorithm,
      nodeIds: [...nodeIds],
      nodes,
      width: bounds.width,
      height: bounds.height
    };

    if (Array.isArray(region.childLayouts)) {
      layout.childLayouts = region.childLayouts;
    }

    return layout;
  }

  toBlockNode(layout) {
    return {
      id: this.blockId(layout),
      width: Math.max(this.minimumBlockSize, layout.width),
      height: Math.max(this.minimumBlockSize, layout.height)
    };
  }

  getNodeCenter(node) {
    return {
      x: node.x + ((Number.isFinite(node.width) ? node.width : 0) / 2),
      y: node.y + ((Number.isFinite(node.height) ? node.height : 0) / 2)
    };
  }

  getNodeCenterAverage(nodes) {
    if (!nodes || nodes.length === 0) {
      return { x: 0, y: 0 };
    }

    const centerSum = nodes.reduce((sum, node) => {
      const center = this.getNodeCenter(node);

      return {
        x: sum.x + center.x,
        y: sum.y + center.y
      };
    }, { x: 0, y: 0 });

    return {
      x: centerSum.x / nodes.length,
      y: centerSum.y / nodes.length
    };
  }

  blockId(layout) {
    return `auto-block-${layout.id}`;
  }
}

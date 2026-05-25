import { GEM_CONFIG } from "./Config";

export default class CoordinateNormalization {

  normalize(nodes, vertices) {
    const vertexById = new Map(vertices.map((vertex) => [vertex.id, vertex]));
    const laidOutNodes = nodes.map((node) => {
      const vertex = vertexById.get(node.id);

      if (!vertex) {
        return node;
      }

      return {
        ...node,
        x: vertex.x - this.getNodeWidth(node) / 2,
        y: vertex.y - this.getNodeHeight(node) / 2
      };
    });

    const minX = Math.min(...laidOutNodes.map((node) => node.x).filter(Number.isFinite));
    const minY = Math.min(...laidOutNodes.map((node) => node.y).filter(Number.isFinite));
    const shiftX = Number.isFinite(minX) ? GEM_CONFIG.startX - minX : 0;
    const shiftY = Number.isFinite(minY) ? GEM_CONFIG.startY - minY : 0;

    return laidOutNodes.map((node) => ({
      ...node,
      x: node.x + shiftX,
      y: node.y + shiftY
    }));
  }

  getNodeHeight(node) {
    return Number.isFinite(node?.height) ? node.height : 0;
  }

  getNodeWidth(node) {
    return Number.isFinite(node?.width) ? node.width : 0;
  }
}

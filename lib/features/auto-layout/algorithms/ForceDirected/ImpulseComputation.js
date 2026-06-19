import { GEM_CONFIG } from "./Config";

export default class ImpulseComputation {

  compute(vertex, graph) {
    const inertia = this.getInertia(vertex);
    const impulse = {
      x: (graph.barycenter.x - vertex.x) * GEM_CONFIG.gravitationalConstant * inertia,
      y: (graph.barycenter.y - vertex.y) * GEM_CONFIG.gravitationalConstant * inertia
    };

    impulse.x += this.randomBetween(
      graph.random,
      -GEM_CONFIG.maximalDisturbance,
      GEM_CONFIG.maximalDisturbance
    );
    impulse.y += this.randomBetween(
      graph.random,
      -GEM_CONFIG.maximalDisturbance,
      GEM_CONFIG.maximalDisturbance
    );

    for (const other of graph.vertices) {
      if (other.id === vertex.id) {
        continue;
      }

      this.applyRepulsion(vertex, other, impulse, graph);
    }

    for (const adjacentId of graph.adjacentById.get(vertex.id) || []) {
      const adjacent = graph.vertexById.get(adjacentId);

      if (!adjacent) {
        continue;
      }

      this.applyAttraction(vertex, adjacent, inertia, impulse, graph);
    }

    return impulse;
  }

  applyRepulsion(vertex, other, impulse, graph) {
    const delta = this.getDelta(vertex, other);
    const distance = this.getDistance(delta);
    const clearance = this.getDirectionalClearance(vertex, other, delta) + GEM_CONFIG.nodeGap;
    const effectiveDistance = Math.max(distance - clearance, GEM_CONFIG.minDistance);
    const desiredLength = this.getDesiredLength(vertex, other, graph);
    const repulsion = (desiredLength * desiredLength) / effectiveDistance;
    const unit = {
      x: delta.x / distance,
      y: delta.y / distance
    };

    impulse.x += unit.x * repulsion;
    impulse.y += unit.y * repulsion;
  }

  applyAttraction(vertex, adjacent, inertia, impulse, graph) {
    const delta = this.getDelta(vertex, adjacent);
    const distanceSquared = this.getDistanceSquared(delta);
    const desiredLength = this.getDesiredLength(vertex, adjacent, graph);
    const attraction = distanceSquared / ((desiredLength * desiredLength) * inertia);

    impulse.x -= delta.x * attraction;
    impulse.y -= delta.y * attraction;
  }

  getDistanceSquared(delta) {
    return Math.max(
      delta.x * delta.x + delta.y * delta.y,
      GEM_CONFIG.minDistance * GEM_CONFIG.minDistance
    );
  }

  getDistance(delta) {
    return Math.sqrt(this.getDistanceSquared(delta));
  }

  getDelta(vertex, other) {
    let dx = vertex.x - other.x;
    let dy = vertex.y - other.y;

    if (Math.abs(dx) <= GEM_CONFIG.minDistance && Math.abs(dy) <= GEM_CONFIG.minDistance) {
      dx = GEM_CONFIG.minDistance;
      dy = GEM_CONFIG.minDistance;
    }

    return { x: dx, y: dy };
  }

  getInertia(vertex) {
    return 1 + vertex.degree / 2;
  }

  getDesiredLength(vertex, other, graph) {
    return Math.max(
      graph.graphSpacing || GEM_CONFIG.desiredEdgeLength,
      this.getNodeRadius(vertex.node) + this.getNodeRadius(other.node) + GEM_CONFIG.nodeGap
    );
  }

  getDirectionalClearance(vertex, other, delta) {
    const distance = this.getDistance(delta);
    const unit = {
      x: delta.x / distance,
      y: delta.y / distance
    };

    return this.getDirectionalHalfExtent(vertex.node, unit) +
      this.getDirectionalHalfExtent(other.node, unit);
  }

  getDirectionalHalfExtent(node, unit) {
    return Math.abs(unit.x) * this.getNodeWidth(node) / 2 +
      Math.abs(unit.y) * this.getNodeHeight(node) / 2;
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

  randomBetween(random, min, max) {
    return min + random() * (max - min);
  }
}

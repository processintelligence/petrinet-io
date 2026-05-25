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

      this.applyRepulsion(vertex, other, impulse);
    }

    for (const adjacentId of graph.adjacentById.get(vertex.id) || []) {
      const adjacent = graph.vertexById.get(adjacentId);

      if (!adjacent) {
        continue;
      }

      this.applyAttraction(vertex, adjacent, inertia, impulse);
    }

    return impulse;
  }

  applyRepulsion(vertex, other, impulse) {
    const delta = this.getDelta(vertex, other);
    const distanceSquared = this.getDistanceSquared(delta);
    const repulsion = (GEM_CONFIG.desiredEdgeLength * GEM_CONFIG.desiredEdgeLength) / distanceSquared;

    impulse.x += delta.x * repulsion;
    impulse.y += delta.y * repulsion;
  }

  applyAttraction(vertex, adjacent, inertia, impulse) {
    const delta = this.getDelta(vertex, adjacent);
    const distanceSquared = this.getDistanceSquared(delta);
    const attraction = distanceSquared / ((GEM_CONFIG.desiredEdgeLength * GEM_CONFIG.desiredEdgeLength) * inertia);

    impulse.x -= delta.x * attraction;
    impulse.y -= delta.y * attraction;
  }

  getDistanceSquared(delta) {
    return Math.max(
      delta.x * delta.x + delta.y * delta.y,
      GEM_CONFIG.minDistance * GEM_CONFIG.minDistance
    );
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

  randomBetween(random, min, max) {
    return min + random() * (max - min);
  }
}

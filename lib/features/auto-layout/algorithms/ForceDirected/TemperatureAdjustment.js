import { GEM_CONFIG } from "./Config";

export default class TemperatureAdjustment {

  update(vertex, impulse, graph) {
    const impulseLength = Math.hypot(impulse.x, impulse.y);

    if (impulseLength <= GEM_CONFIG.minDistance) {
      return;
    }

    const movement = {
      x: (vertex.temperature * impulse.x) / impulseLength,
      y: (vertex.temperature * impulse.y) / impulseLength
    };

    vertex.x += movement.x;
    vertex.y += movement.y;
    graph.barycenter = this.shiftBarycenter(graph.barycenter, movement, graph.vertices.length);

    if (Math.hypot(vertex.impulseX, vertex.impulseY) > GEM_CONFIG.minDistance) {
      this.adjustLocalTemperature(vertex, movement);
    }

    vertex.impulseX = movement.x;
    vertex.impulseY = movement.y;
  }

  adjustLocalTemperature(vertex, movement) {
    const previousImpulse = {
      x: vertex.impulseX,
      y: vertex.impulseY
    };
    const movementLength = Math.hypot(movement.x, movement.y);
    const previousLength = Math.hypot(previousImpulse.x, previousImpulse.y);
    const denominator = Math.max(movementLength * previousLength, GEM_CONFIG.minDistance);
    const cos = this.clamp(
      (movement.x * previousImpulse.x + movement.y * previousImpulse.y) / denominator,
      -1,
      1
    );
    const sin = this.clamp(
      (previousImpulse.x * movement.y - previousImpulse.y * movement.x) / denominator,
      -1,
      1
    );

    if (Math.abs(sin) >= Math.sin((Math.PI + GEM_CONFIG.rotationOpening) / 2)) {
      vertex.skewGauge = this.clamp(
        vertex.skewGauge + GEM_CONFIG.rotationSensitivity * Math.sign(sin),
        -0.95,
        0.95
      );
    }

    if (Math.abs(cos) >= Math.cos(GEM_CONFIG.oscillationOpening / 2)) {
      vertex.temperature *= 1 + GEM_CONFIG.oscillationSensitivity * cos;
    }

    vertex.temperature *= 1 - Math.abs(vertex.skewGauge);
    vertex.temperature = this.clamp(
      vertex.temperature,
      GEM_CONFIG.minTemperature / 2,
      GEM_CONFIG.maxTemperature
    );
  }

  clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  shiftBarycenter(barycenter, movement, vertexCount) {
    return {
      x: barycenter.x + movement.x / vertexCount,
      y: barycenter.y + movement.y / vertexCount
    };
  }
}

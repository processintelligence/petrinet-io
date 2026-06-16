import { GEM_CONFIG } from "./ForceDirected/Config";

export default class ForceDirected {

  static $inject = [
    "forceDirectedInitialization",
    "forceDirectedImpulseComputation",
    "forceDirectedTemperatureAdjustment",
    "forceDirectedCoordinateNormalization",
    "edgeRouting"
  ];

  constructor(
    forceDirectedInitialization,
    forceDirectedImpulseComputation,
    forceDirectedTemperatureAdjustment,
    forceDirectedCoordinateNormalization,
    edgeRouting
  ) {
    this.initialization = forceDirectedInitialization;
    this.impulseComputation = forceDirectedImpulseComputation;
    this.temperatureAdjustment = forceDirectedTemperatureAdjustment;
    this.coordinateNormalization = forceDirectedCoordinateNormalization;
    this.edgeRouting = edgeRouting;
  }

  layout(petriNet) {
    if (!petriNet.nodes || petriNet.nodes.length === 0) {
      return petriNet;
    }

    const graph = this.initialization.initialize(petriNet);
    const maxRounds = Math.max(1, GEM_CONFIG.maxRoundsFactor * graph.vertices.length);

    for (let round = 0; round < maxRounds; round++) {
      if (this.getGlobalTemperature(graph.vertices) <= GEM_CONFIG.minTemperature) {
        break;
      }

      const permutation = this.createPermutation(graph.vertices.length, graph.random);

      for (const vertexIndex of permutation) {
        const vertex = graph.vertices[vertexIndex];
        const impulse = this.impulseComputation.compute(vertex, graph);

        this.temperatureAdjustment.update(vertex, impulse, graph);
      }
    }

    const laidOutPN = {
      ...petriNet,
      nodes: this.coordinateNormalization.normalize(petriNet.nodes, graph.vertices)
    };

    return this.edgeRouting.route(laidOutPN);
  }

  createPermutation(length, random) {
    const values = Array.from({ length }, (_, index) => index);

    for (let index = values.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(random() * (index + 1));
      const value = values[index];
      values[index] = values[swapIndex];
      values[swapIndex] = value;
    }

    return values;
  }

  getGlobalTemperature(vertices) {
    const total = vertices.reduce((sum, vertex) => sum + vertex.temperature, 0);

    return total / vertices.length;
  }
}

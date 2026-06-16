import { GEM_CONFIG } from "./Config";

export default class Initialization {

  initialize(petriNet) {
    const seed = this.createSeed(petriNet);
    const random = this.createRandom(seed);
    const degreeById = this.buildDegreeById(petriNet.nodes, petriNet.edges);
    const adjacentById = this.buildAdjacentById(petriNet.nodes, petriNet.edges);
    const initialCentersById = this.buildInsertionPlacement(
      petriNet.nodes,
      degreeById,
      adjacentById,
      random
    );
    const vertices = petriNet.nodes.map((node) => {
      const center = initialCentersById.get(node.id) || { x: 0, y: 0 };

      return {
        id: node.id,
        node,
        x: center.x,
        y: center.y,
        impulseX: 0,
        impulseY: 0,
        temperature: GEM_CONFIG.initialTemperature,
        skewGauge: 0,
        degree: degreeById.get(node.id) || 0
      };
    });

    return {
      vertices,
      random,
      barycenter: this.averagePoints(vertices),
      adjacentById,
      vertexById: new Map(vertices.map((vertex) => [vertex.id, vertex]))
    };
  }

  buildInsertionPlacement(nodes, degreeById, adjacentById, random) {
    const centersById = new Map();
    const orderedNodes = [...nodes].sort((a, b) => {
      const degreeDelta = (degreeById.get(b.id) || 0) - (degreeById.get(a.id) || 0);

      if (degreeDelta !== 0) {
        return degreeDelta;
      }

      return String(a.id).localeCompare(String(b.id));
    });

    for (const node of orderedNodes) {
      const placedNeighborCenters = (adjacentById.get(node.id) || [])
        .map((neighborId) => centersById.get(neighborId))
        .filter((center) => center);

      if (centersById.size === 0) {
        centersById.set(node.id, { x: 0, y: 0 });
        continue;
      }

      if (placedNeighborCenters.length > 0) {
        const neighborBarycenter = this.averagePoints(placedNeighborCenters);
        const angle = random() * 2 * Math.PI;

        centersById.set(node.id, {
          x: neighborBarycenter.x + Math.cos(angle) * GEM_CONFIG.desiredEdgeLength,
          y: neighborBarycenter.y + Math.sin(angle) * GEM_CONFIG.desiredEdgeLength
        });
        continue;
      }

      const layoutBarycenter = this.averagePoints([...centersById.values()]);
      const angle = random() * 2 * Math.PI;
      const radius = GEM_CONFIG.desiredEdgeLength * Math.sqrt(centersById.size + 1);

      centersById.set(node.id, {
        x: layoutBarycenter.x + Math.cos(angle) * radius,
        y: layoutBarycenter.y + Math.sin(angle) * radius
      });
    }

    return centersById;
  }

  averagePoints(points) {
    if (points.length === 0) {
      return { x: 0, y: 0 };
    }

    const totals = points.reduce((sum, point) => ({
      x: sum.x + point.x,
      y: sum.y + point.y
    }), { x: 0, y: 0 });

    return {
      x: totals.x / points.length,
      y: totals.y / points.length
    };
  }

  buildAdjacentById(nodes, edges) {
    const adjacentById = new Map(nodes.map((node) => [node.id, []]));

    for (const edge of edges || []) {
      if (adjacentById.has(edge.source)) {
        adjacentById.get(edge.source).push(edge.target);
      }

      if (adjacentById.has(edge.target)) {
        adjacentById.get(edge.target).push(edge.source);
      }
    }

    return adjacentById;
  }

  buildDegreeById(nodes, edges) {
    const degreeById = new Map(nodes.map((node) => [node.id, 0]));

    for (const edge of edges || []) {
      if (degreeById.has(edge.source)) {
        degreeById.set(edge.source, degreeById.get(edge.source) + 1);
      }

      if (degreeById.has(edge.target)) {
        degreeById.set(edge.target, degreeById.get(edge.target) + 1);
      }
    }

    return degreeById;
  }

  createRandom(seed) {
    let state = seed || 1;

    return () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;

      return ((state >>> 0) / 4294967296);
    };
  }

  createSeed(petriNet) {
    const text = [
      ...petriNet.nodes.map((node) => node.id),
      ...(petriNet.edges || []).map((edge) => `${edge.source}->${edge.target}`)
    ].join("|");
    let hash = 2166136261;

    for (let index = 0; index < text.length; index++) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
  }
}

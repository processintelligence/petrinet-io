export default class BlockLayout {

  static $inject = [
    "circularReduction",
    "circularOrdering",
    "circularInsertion",
    "circularCirclePlacement",
    "circularPostprocessing"
  ];

  constructor(
    circularReduction,
    circularOrdering,
    circularInsertion,
    circularCirclePlacement,
    circularPostprocessing
  ) {
    this.circularReduction = circularReduction;
    this.circularOrdering = circularOrdering;
    this.circularInsertion = circularInsertion;
    this.circularCirclePlacement = circularCirclePlacement;
    this.circularPostprocessing = circularPostprocessing;
  }

  layoutBlocks(petriNet) {
    const decomposition = petriNet.circularDecomposition;

    if (!decomposition || decomposition.blocks.length === 0) {
      return petriNet;
    }

    const nodeById = new Map(petriNet.nodes.map((node) => [node.id, node]));
    const edgeById = new Map(petriNet.edges.map((edge) => [edge.id, edge]));
    const blockLayoutById = new Map();

    for (const block of decomposition.blocks) {
      const localGraph = {
        nodes: block.nodeIds
          .map((nodeId) => nodeById.get(nodeId))
          .filter(Boolean)
          .map((node) => ({ ...node })),
        edges: block.edgeIds
          .map((edgeId) => edgeById.get(edgeId))
          .filter(Boolean)
          .map((edge) => ({ ...edge }))
      };
      const reducedPN = this.circularReduction.reduce(localGraph);
      const orderedPN = this.circularOrdering.build(reducedPN);
      const insertedPN = this.circularInsertion.insert(orderedPN);
      const placedPN = this.circularCirclePlacement.place(insertedPN);
      const improvedPN = this.circularPostprocessing.optimize(placedPN);

      blockLayoutById.set(block.id, improvedPN);
    }

    return {
      ...petriNet,
      circularBlockLayoutById: blockLayoutById
    };
  }
}

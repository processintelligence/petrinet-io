export default class Auto {

  static $inject = [
    "autoStructureDetector",
    "autoModularLayout",
    "edgeRouting"
  ];

  constructor(
    autoStructureDetector,
    autoModularLayout,
    edgeRouting
  ) {
    this.autoStructureDetector = autoStructureDetector;
    this.autoModularLayout = autoModularLayout;
    this.edgeRouting = edgeRouting;
  }

  layout(petriNet, detection = null) {
    detection = detection || this.autoStructureDetector.detect(petriNet);
    const modularPN = this.autoModularLayout.layout(this.clonePetriNet(petriNet), detection);

    return this.edgeRouting.route(modularPN);
  }

  clonePetriNet(petriNet) {
    return {
      ...petriNet,
      nodes: (petriNet.nodes || []).map((node) => ({ ...node })),
      edges: (petriNet.edges || []).map((edge) => ({ ...edge }))
    };
  }
}

export default class AutoLayoutService {

  static $inject = ["graphExtractor", "algorithmSelector", "layoutApplier", "simulationService"];

  constructor(graphExtractor, algorithmSelector, layoutApplier, simulationService) {
    this.graphExtractor = graphExtractor;
    this.algorithmSelector = algorithmSelector;
    this.layoutApplier = layoutApplier;
    this.simulationService = simulationService;
  }

  run(algorithmName = "sugiyama") {
    const extractedPN =this.graphExtractor.extract();

    console.log(
      `${this.toGraphvizDot(extractedPN)}`
    );

    const algorithm = this.algorithmSelector.select(algorithmName);

    const laidOutPN = algorithm.layout(extractedPN);

    this.layoutApplier.apply(laidOutPN);
  }

  toGraphvizDot(petriNet) {
    const places = petriNet.nodes.filter((node) => node.type === "place");
    const transitions = petriNet.nodes.filter((node) => node.type === "transition");
    const lines = [
      "digraph PetriNet {",
      "  rankdir=LR;",
      "",
      "  node [fontname=\"Arial\"];",
      "",
      "  // Places",
      "  node [shape=circle, width=0.35, fixedsize=true, label=\"\"];"
    ];

    lines.push(...this.formatGraphvizNodeDeclarations(places));
    lines.push(
      "",
      "  // Transitions",
      "  node [shape=box, width=0.45, height=0.45, fixedsize=true];"
    );

    for (const transition of transitions) {
      lines.push(`  ${this.quoteDotId(transition.id)} [${this.formatTransitionAttributes(transition)}];`);
    }

    lines.push(
      "",
      "  // Process flow"
    );

    for (const edge of petriNet.edges) {
      lines.push(`  ${this.quoteDotId(edge.source)} -> ${this.quoteDotId(edge.target)};`);
    }

    lines.push("}");

    return lines.join("\n");
  }

  formatGraphvizNodeDeclarations(nodes) {
    if (nodes.length === 0) {
      return [];
    }

    return this.chunk(nodes.map((node) => this.quoteDotId(node.id)), 8)
      .map((nodeIds) => `  ${nodeIds.join("; ")};`);
  }

  formatTransitionAttributes(transition) {
    const attributes = [
      `label=${this.quoteDotValue(transition.name || transition.id)}`
    ];

    if (transition.empty) {
      attributes.push("style=filled", "fillcolor=black", "fontcolor=white");
    }

    return attributes.join(", ");
  }

  chunk(values, size) {
    const chunks = [];

    for (let index = 0; index < values.length; index += size) {
      chunks.push(values.slice(index, index + size));
    }

    return chunks;
  }

  quoteDotId(value) {
    return this.quoteDotValue(value);
  }

  quoteDotValue(value) {
    return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`;
  }
}

export default class AutoLayoutService {

  static $inject = [
    "graphExtractor",
    "algorithmSelector",
    "layoutApplier",
    "simulationService",
    "autoStructureDetector",
    "autoStructureHighlighter"
  ];

  constructor(
    graphExtractor,
    algorithmSelector,
    layoutApplier,
    simulationService,
    autoStructureDetector,
    autoStructureHighlighter
  ) {
    this.graphExtractor = graphExtractor;
    this.algorithmSelector = algorithmSelector;
    this.layoutApplier = layoutApplier;
    this.simulationService = simulationService;
    this.autoStructureDetector = autoStructureDetector;
    this.autoStructureHighlighter = autoStructureHighlighter;
  }

  run(algorithmName = "sugiyama") {
    const extractedPN = this.graphExtractor.extract();
    const algorithm = this.algorithmSelector.select(algorithmName);
    const detection = algorithmName === "auto"
      ? this.autoStructureDetector.detect(extractedPN)
      : null;

    if (detection) {
      this.autoStructureHighlighter.highlight(detection);
    }

    const laidOutPN = algorithm.layout(extractedPN, detection);

    this.layoutApplier.apply(laidOutPN);
  }

  previewStructures() {
    const extractedPN = this.graphExtractor.extract();
    const detection = this.autoStructureDetector.detect(extractedPN);

    this.autoStructureHighlighter.highlight(detection);

    return detection;
  }
}

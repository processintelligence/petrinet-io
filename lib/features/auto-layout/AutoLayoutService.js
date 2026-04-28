export default class AutoLayoutService {

  static $inject = ["graphExtractor", "algorithmSelector", "layoutApplier", "simulationService"];

  constructor(graphExtractor, algorithmSelector, layoutApplier, simulationService) {
    this.graphExtractor = graphExtractor;
    this.algorithmSelector = algorithmSelector;
    this.layoutApplier = layoutApplier;
    this.simulationService = simulationService;
  }

  run() {
    const extractedPN =this.graphExtractor.extract();

    const algorithm = this.algorithmSelector.select();

    const laidOutPN = algorithm.layout(extractedPN);

    this.layoutApplier.apply(laidOutPN);
  }
}

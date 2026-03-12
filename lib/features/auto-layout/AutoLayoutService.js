export default class AutoLayoutService {

  static $inject = ["graphExtractor", "algorithmSelector", "layoutApplier", "simulationService"];

  constructor(graphExtractor, algorithmSelector, layoutApplier, simulationService) {
    this.graphExtractor = graphExtractor;
    this.algorithmSelector = algorithmSelector;
    this.layoutApplier = layoutApplier;
    this.simulationService = simulationService;
  }

  run(_options = {}) {
    // TODO: Orchestrate extraction, algorithm selection, layout execution, and apply.
  }
}

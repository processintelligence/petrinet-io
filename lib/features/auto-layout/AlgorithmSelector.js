export default class AlgorithmSelector {

  static $inject = ["sugiyamaLayoutAlgorithm"]

  constructor(sugiyamaLayoutAlgorithm) {
    this.sugiyamaLayoutAlgorithm = sugiyamaLayoutAlgorithm;
  }

  select() {
    // TODO: Resolve the correct algorithms based on manual mode or auto detection.
    return this.sugiyamaLayoutAlgorithm;
  }
}

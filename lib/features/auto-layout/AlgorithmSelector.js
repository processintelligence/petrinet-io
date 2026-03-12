export default class AlgorithmSelector {

  static $inject = ["objectCentricAlgorithm"];

  constructor(objectCentricAlgorithm) {
    this.objectCentricAlgorithm = objectCentricAlgorithm;
  }

  select(_options = {}, _graph = null) {
    // TODO: Resolve the correct algorithm based on manual mode or auto detection.
  }
}

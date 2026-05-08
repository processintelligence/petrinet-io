export default class AlgorithmSelector {

  static $inject = ["sugiyamaLayoutAlgorithm", "circularLayoutAlgorithm"]

  constructor(sugiyamaLayoutAlgorithm, circularLayoutAlgorithm) {
    this.sugiyamaLayoutAlgorithm = sugiyamaLayoutAlgorithm;
    this.circularLayoutAlgorithm = circularLayoutAlgorithm;
  }

  select(algorithmName = "sugiyama") {
    if (algorithmName === "circular") {
      return this.circularLayoutAlgorithm;
    }

    return this.sugiyamaLayoutAlgorithm;
  }
}

export default class AlgorithmSelector {

  static $inject = ["sugiyamaLayoutAlgorithm", "circularLayoutAlgorithm", "forceDirectedLayoutAlgorithm"]

  constructor(sugiyamaLayoutAlgorithm, circularLayoutAlgorithm, forceDirectedLayoutAlgorithm) {
    this.sugiyamaLayoutAlgorithm = sugiyamaLayoutAlgorithm;
    this.circularLayoutAlgorithm = circularLayoutAlgorithm;
    this.forceDirectedLayoutAlgorithm = forceDirectedLayoutAlgorithm;
  }

  select(algorithmName = "sugiyama") {
    if (algorithmName === "circular") {
      return this.circularLayoutAlgorithm;
    }

    if (algorithmName === "force-directed") {
      return this.forceDirectedLayoutAlgorithm;
    }

    return this.sugiyamaLayoutAlgorithm;
  }
}

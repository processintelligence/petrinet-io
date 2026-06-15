export default class AlgorithmSelector {

  static $inject = [
    "sugiyamaLayoutAlgorithm",
    "circularLayoutAlgorithm",
    "forceDirectedLayoutAlgorithm",
    "autoLayoutAlgorithm"
  ]

  constructor(
    sugiyamaLayoutAlgorithm,
    circularLayoutAlgorithm,
    forceDirectedLayoutAlgorithm,
    autoLayoutAlgorithm
  ) {
    this.sugiyamaLayoutAlgorithm = sugiyamaLayoutAlgorithm;
    this.circularLayoutAlgorithm = circularLayoutAlgorithm;
    this.forceDirectedLayoutAlgorithm = forceDirectedLayoutAlgorithm;
    this.autoLayoutAlgorithm = autoLayoutAlgorithm;
  }

  select(algorithmName = "sugiyama") {
    if (algorithmName === "auto") {
      return this.autoLayoutAlgorithm;
    }

    if (algorithmName === "circular") {
      return this.circularLayoutAlgorithm;
    }

    if (algorithmName === "force-directed") {
      return this.forceDirectedLayoutAlgorithm;
    }

    return this.sugiyamaLayoutAlgorithm;
  }
}

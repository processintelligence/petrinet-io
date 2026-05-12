export default class Circular {

  static $inject = [
    "circularGraphClassifier",
    "circularSingleCircleReduction",
    "circularSingleCircleOrdering",
    "circularSingleCircleInsertion",
    "circularCirclePlacement",
    "circularPostprocessing",
    "circularEdgeRouting",
    "sugiyamaLayoutAlgorithm"
  ];

  constructor(
    circularGraphClassifier,
    circularSingleCircleReduction,
    circularSingleCircleOrdering,
    circularSingleCircleInsertion,
    circularCirclePlacement,
    circularPostprocessing,
    circularEdgeRouting,
    sugiyamaLayoutAlgorithm
  ) {
    this.circularGraphClassifier = circularGraphClassifier;
    this.circularSingleCircleReduction = circularSingleCircleReduction;
    this.circularSingleCircleOrdering = circularSingleCircleOrdering;
    this.circularSingleCircleInsertion = circularSingleCircleInsertion;
    this.circularCirclePlacement = circularCirclePlacement;
    this.circularPostprocessing = circularPostprocessing;
    this.circularEdgeRouting = circularEdgeRouting;
    this.sugiyamaLayoutAlgorithm = sugiyamaLayoutAlgorithm;
  }

  layout(petriNet) {
    // const isSingleCircle = this.circularGraphClassifier.isSingleCircle(petriNet);

    // if (!isSingleCircle) {
    //   return this.sugiyamaLayoutAlgorithm.layout(petriNet);
    // }

    const reducedPN = this.circularSingleCircleReduction.reduce(petriNet);
    const orderedPN = this.circularSingleCircleOrdering.build(reducedPN);
    const insertedPN = this.circularSingleCircleInsertion.insert(orderedPN);
    const placedPN = this.circularCirclePlacement.place(insertedPN);
    const improvedPN = this.circularPostprocessing.optimize(placedPN);

    return this.circularEdgeRouting.route(improvedPN);
  }
}

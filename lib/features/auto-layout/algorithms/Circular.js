export default class Circular {

  static $inject = [
    "circularGraphClassifier",
    "circularSingleCircleReduction",
    "circularSingleCircleOrdering",
    "circularSingleCircleInsertion",
    "circularCirclePlacement",
    "circularEdgeRouting",
    "sugiyamaLayoutAlgorithm"
  ];

  constructor(
    circularGraphClassifier,
    circularSingleCircleReduction,
    circularSingleCircleOrdering,
    circularSingleCircleInsertion,
    circularCirclePlacement,
    circularEdgeRouting,
    sugiyamaLayoutAlgorithm
  ) {
    this.circularGraphClassifier = circularGraphClassifier;
    this.circularSingleCircleReduction = circularSingleCircleReduction;
    this.circularSingleCircleOrdering = circularSingleCircleOrdering;
    this.circularSingleCircleInsertion = circularSingleCircleInsertion;
    this.circularCirclePlacement = circularCirclePlacement;
    this.circularEdgeRouting = circularEdgeRouting;
    this.sugiyamaLayoutAlgorithm = sugiyamaLayoutAlgorithm;
  }

  layout(petriNet) {
    const graphInfo = this.circularGraphClassifier.classify(petriNet);
    const reducedPN = this.circularSingleCircleReduction.reduce(petriNet);
    const orderedPN = this.circularSingleCircleOrdering.build(reducedPN);
    const insertedPN = this.circularSingleCircleInsertion.insert(orderedPN);
    const placedPN = this.circularCirclePlacement.place(insertedPN);
    const routedPN = this.circularEdgeRouting.route(placedPN);


    return this.sugiyamaLayoutAlgorithm.layout(petriNet);
  }
}

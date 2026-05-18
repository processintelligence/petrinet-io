export default class Circular {

  static $inject = [
    "circularGraphClassifier",
    "circularReduction",
    "circularOrdering",
    "circularInsertion",
    "circularCirclePlacement",
    "circularPostprocessing",
    "circularEdgeRouting",
    "sugiyamaLayoutAlgorithm",
    "circularMultiDecomposition",
    "circularMultiPreparation",
    "circularMultiBlockLayout",
    "circularMultiPlacement",
    "circularMultiComposition"
  ];

  constructor(
    circularGraphClassifier,
    circularReduction,
    circularOrdering,
    circularInsertion,
    circularCirclePlacement,
    circularPostprocessing,
    circularEdgeRouting,
    sugiyamaLayoutAlgorithm,
    circularMultiDecomposition,
    circularMultiPreparation,
    circularMultiBlockLayout,
    circularMultiPlacement,
    circularMultiComposition
  ) {
    this.circularGraphClassifier = circularGraphClassifier;
    this.circularReduction = circularReduction;
    this.circularOrdering = circularOrdering;
    this.circularInsertion = circularInsertion;
    this.circularCirclePlacement = circularCirclePlacement;
    this.circularPostprocessing = circularPostprocessing;
    this.circularEdgeRouting = circularEdgeRouting;
    this.sugiyamaLayoutAlgorithm = sugiyamaLayoutAlgorithm;
    this.circularMultiDecomposition = circularMultiDecomposition;
    this.circularMultiPreparation = circularMultiPreparation;
    this.circularMultiBlockLayout = circularMultiBlockLayout;
    this.circularMultiPlacement = circularMultiPlacement;
    this.circularMultiComposition = circularMultiComposition;
  }

  layout(petriNet) {
    const isSingleCircle = this.circularGraphClassifier.isSingleCircle(petriNet);

    if (!isSingleCircle) {
      const decomposedPN = this.circularMultiDecomposition.decompose(petriNet);
      const preparedPN = this.circularMultiPreparation.prepare(decomposedPN);
      const blockLayoutPN = this.circularMultiBlockLayout.layoutBlocks(preparedPN);
      const placedPN = this.circularMultiPlacement.place(blockLayoutPN);
      const multiCirclePN = this.circularMultiComposition.compose(placedPN);

      return this.circularEdgeRouting.route(multiCirclePN);
    }

    const reducedPN = this.circularReduction.reduce(petriNet);
    const orderedPN = this.circularOrdering.build(reducedPN);
    const insertedPN = this.circularInsertion.insert(orderedPN);
    const placedPN = this.circularCirclePlacement.place(insertedPN);
    const improvedPN = this.circularPostprocessing.optimize(placedPN);

    return this.circularEdgeRouting.route(improvedPN);
  }
}

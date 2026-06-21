import AutoLayoutService from "./AutoLayoutService.js";
import GraphExtractor from "./GraphExtractor.js";
import LayoutApplier from "./LayoutApplier.js";
import AlgorithmSelector from "./AlgorithmSelector.js";
import Sugiyama from "./algorithms/Sugiyama";
import Circular from "./algorithms/Circular";
import ForceDirected from "./algorithms/ForceDirected";
import Auto from "./algorithms/Auto";
import ForceDirectedInitialization from "./algorithms/ForceDirected/Initialization";
import ForceDirectedImpulseComputation from "./algorithms/ForceDirected/ImpulseComputation";
import ForceDirectedTemperatureAdjustment from "./algorithms/ForceDirected/TemperatureAdjustment";
import ForceDirectedCoordinateNormalization from "./algorithms/ForceDirected/CoordinateNormalization";
import CircularGraphClassifier from "./algorithms/Circular/GraphClassifier";
import CircularMultiDecomposition from "./algorithms/Circular/MultiCircle/Decomposition";
import CircularMultiPreparation from "./algorithms/Circular/MultiCircle/Preparation";
import CircularMultiBlockLayout from "./algorithms/Circular/MultiCircle/BlockLayout";
import CircularMultiPlacement from "./algorithms/Circular/MultiCircle/Placement";
import CircularMultiComposition from "./algorithms/Circular/MultiCircle/Composition";
import CircularReduction from "./algorithms/Circular/SingleCircle/Reduction";
import CircularOrdering from "./algorithms/Circular/SingleCircle/Ordering";
import CircularInsertion from "./algorithms/Circular/SingleCircle/Insertion";
import CircularCirclePlacement from "./algorithms/Circular/SingleCircle/CirclePlacement";
import CircularPostprocessing from "./algorithms/Circular/SingleCircle/Postprocessing";
import CircularEdgeRouting from "./algorithms/Circular/EdgeRouting";
import CycleRemoval from "./algorithms/Sugiyama/CycleRemoval";
import LayerAssignment from "./algorithms/Sugiyama/LayerAssignment";
import DummyInsertion from "./algorithms/Sugiyama/DummyInsertion";
import VertexOrdering from "./algorithms/Sugiyama/VertexOrdering";
import CoordinateAssignment from "./algorithms/Sugiyama/CoordinateAssignment";
import EdgeRouting from "./algorithms/Sugiyama/EdgeRouting";
import AutoGraphAnalysis from "./algorithms/Auto/detection/GraphAnalysis";
import AutoCycleDetector from "./algorithms/Auto/detection/detectors/CycleDetector";
import AutoComplexDetector from "./algorithms/Auto/detection/detectors/ComplexDetector";
import AutoBranchDetector from "./algorithms/Auto/detection/detectors/BranchDetector";
import AutoSequenceDetector from "./algorithms/Auto/detection/detectors/SequenceDetector";
import AutoStructureTreeBuilder from "./algorithms/Auto/detection/StructureTreeBuilder";
import AutoStructureSequenceFiller from "./algorithms/Auto/detection/StructureSequenceFiller";
import AutoStructureDetector from "./algorithms/Auto/detection/StructureDetector";
import AutoStructureHighlighter from "./algorithms/Auto/detection/StructureHighlighter";
import AutoStructurePostProcessor from "./algorithms/Auto/detection/StructurePostProcessor";
import AutoModularLayout from "./algorithms/Auto/ModularLayout";
import AutoCycleRegionLayout from "./algorithms/Auto/layout/CycleRegionLayout";
import AutoBranchRegionLayout from "./algorithms/Auto/layout/BranchRegionLayout";
import AutoBlockLayoutComposer from "./algorithms/Auto/layout/BlockLayoutComposer";
import AutoLayoutGeometry from "./algorithms/Auto/layout/LayoutGeometry";
import AutoLayoutGraph from "./algorithms/Auto/layout/LayoutGraph";


export default {
  __init__: [
    "algorithmSelector",
    "graphExtractor",
    "layoutApplier",
    "autoLayoutService",
    "sugiyamaLayoutAlgorithm",
    "circularLayoutAlgorithm",
    "forceDirectedLayoutAlgorithm",
    "autoLayoutAlgorithm",
    "forceDirectedInitialization",
    "forceDirectedImpulseComputation",
    "forceDirectedTemperatureAdjustment",
    "forceDirectedCoordinateNormalization",
    "circularGraphClassifier",
    "circularMultiDecomposition",
    "circularMultiPreparation",
    "circularMultiBlockLayout",
    "circularMultiPlacement",
    "circularMultiComposition",
    "circularReduction",
    "circularOrdering",
    "circularInsertion",
    "circularCirclePlacement",
    "circularPostprocessing",
    "circularEdgeRouting",
    "cycleRemoval",
    "layerAssignment",
    "dummyInsertion",
    "vertexOrdering",
    "coordinateAssigment",
    "edgeRouting",
    "autoGraphAnalysis",
    "autoCycleDetector",
    "autoComplexDetector",
    "autoBranchDetector",
    "autoSequenceDetector",
    "autoStructureTreeBuilder",
    "autoStructureSequenceFiller",
    "autoStructureDetector",
    "autoStructureHighlighter",
    "autoStructurePostProcessor",
    "autoCycleRegionLayout",
    "autoModularLayout",
    "autoBranchRegionLayout",
    "autoBlockLayoutComposer",
    "autoLayoutGeometry",
    "autoLayoutGraph",
  ],
  autoLayoutService: ["type", AutoLayoutService],
  graphExtractor: ["type", GraphExtractor],
  layoutApplier: ["type", LayoutApplier],
  algorithmSelector: ["type", AlgorithmSelector],
  sugiyamaLayoutAlgorithm: ["type",Sugiyama],
  circularLayoutAlgorithm: ["type", Circular],
  forceDirectedLayoutAlgorithm: ["type", ForceDirected],
  autoLayoutAlgorithm: ["type", Auto],
  forceDirectedInitialization: ["type", ForceDirectedInitialization],
  forceDirectedImpulseComputation: ["type", ForceDirectedImpulseComputation],
  forceDirectedTemperatureAdjustment: ["type", ForceDirectedTemperatureAdjustment],
  forceDirectedCoordinateNormalization: ["type", ForceDirectedCoordinateNormalization],
  circularGraphClassifier: ["type", CircularGraphClassifier],
  circularMultiDecomposition: ["type", CircularMultiDecomposition],
  circularMultiPreparation: ["type", CircularMultiPreparation],
  circularMultiBlockLayout: ["type", CircularMultiBlockLayout],
  circularMultiPlacement: ["type", CircularMultiPlacement],
  circularMultiComposition: ["type", CircularMultiComposition],
  circularReduction: ["type", CircularReduction],
  circularOrdering: ["type", CircularOrdering],
  circularInsertion: ["type", CircularInsertion],
  circularCirclePlacement: ["type", CircularCirclePlacement],
  circularPostprocessing: ["type", CircularPostprocessing],
  circularEdgeRouting: ["type", CircularEdgeRouting],
  cycleRemoval: ["type", CycleRemoval],
  layerAssignment: ["type", LayerAssignment],
  dummyInsertion: ["type", DummyInsertion],
  vertexOrdering: ["type", VertexOrdering],
  coordinateAssigment: ["type", CoordinateAssignment],
  edgeRouting: ["type", EdgeRouting],
  autoGraphAnalysis: ["type", AutoGraphAnalysis],
  autoCycleDetector: ["type", AutoCycleDetector],
  autoComplexDetector: ["type", AutoComplexDetector],
  autoBranchDetector: ["type", AutoBranchDetector],
  autoSequenceDetector: ["type", AutoSequenceDetector],
  autoStructureTreeBuilder: ["type", AutoStructureTreeBuilder],
  autoStructureSequenceFiller: ["type", AutoStructureSequenceFiller],
  autoStructureDetector: ["type", AutoStructureDetector],
  autoStructureHighlighter: ["type", AutoStructureHighlighter],
  autoStructurePostProcessor: ["type", AutoStructurePostProcessor],
  autoCycleRegionLayout: ["type", AutoCycleRegionLayout],
  autoModularLayout: ["type", AutoModularLayout],
  autoBranchRegionLayout: ["type", AutoBranchRegionLayout],
  autoBlockLayoutComposer: ["type", AutoBlockLayoutComposer],
  autoLayoutGeometry: ["type", AutoLayoutGeometry],
  autoLayoutGraph: ["type", AutoLayoutGraph],
};

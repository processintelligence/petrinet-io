import AutoLayoutService from "./AutoLayoutService.js";
import GraphExtractor from "./GraphExtractor.js";
import LayoutApplier from "./LayoutApplier.js";
import AlgorithmSelector from "./AlgorithmSelector.js";
import Sugiyama from "./algorithms/Sugiyama";
import Circular from "./algorithms/Circular";
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


export default {
  __init__: [
    "algorithmSelector",
    "graphExtractor",
    "layoutApplier",
    "autoLayoutService",
    "sugiyamaLayoutAlgorithm",
    "circularLayoutAlgorithm",
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
  ],
  autoLayoutService: ["type", AutoLayoutService],
  graphExtractor: ["type", GraphExtractor],
  layoutApplier: ["type", LayoutApplier],
  algorithmSelector: ["type", AlgorithmSelector],
  sugiyamaLayoutAlgorithm: ["type",Sugiyama],
  circularLayoutAlgorithm: ["type", Circular],
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
};

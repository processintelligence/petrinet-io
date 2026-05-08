import AutoLayoutService from "./AutoLayoutService.js";
import GraphExtractor from "./GraphExtractor.js";
import LayoutApplier from "./LayoutApplier.js";
import AlgorithmSelector from "./AlgorithmSelector.js";
import Sugiyama from "./algorithms/Sugiyama";
import Circular from "./algorithms/Circular";
import CircularGraphClassifier from "./algorithms/Circular/GraphClassifier";
import CircularSingleCircleReduction from "./algorithms/Circular/SingleCircleReduction";
import CircularSingleCircleOrdering from "./algorithms/Circular/SingleCircleOrdering";
import CircularSingleCircleInsertion from "./algorithms/Circular/SingleCircleInsertion";
import CircularCirclePlacement from "./algorithms/Circular/CirclePlacement";
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
    "circularSingleCircleReduction",
    "circularSingleCircleOrdering",
    "circularSingleCircleInsertion",
    "circularCirclePlacement",
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
  circularSingleCircleReduction: ["type", CircularSingleCircleReduction],
  circularSingleCircleOrdering: ["type", CircularSingleCircleOrdering],
  circularSingleCircleInsertion: ["type", CircularSingleCircleInsertion],
  circularCirclePlacement: ["type", CircularCirclePlacement],
  circularEdgeRouting: ["type", CircularEdgeRouting],
  cycleRemoval: ["type", CycleRemoval],
  layerAssignment: ["type", LayerAssignment],
  dummyInsertion: ["type", DummyInsertion],
  vertexOrdering: ["type", VertexOrdering],
  coordinateAssigment: ["type", CoordinateAssignment],
  edgeRouting: ["type", EdgeRouting],
};

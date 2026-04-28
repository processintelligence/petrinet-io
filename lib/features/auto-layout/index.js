import AutoLayoutService from "./AutoLayoutService.js";
import GraphExtractor from "./GraphExtractor.js";
import LayoutApplier from "./LayoutApplier.js";
import AlgorithmSelector from "./AlgorithmSelector.js";
import Sugiyama from "./algorithms/Sugiyama";
import CycleRemoval from "./algorithms/Sugiyama/CycleRemoval";
import LayerAssignment from "./algorithms/Sugiyama/LayerAssignment";
import DummyInsertion from "./algorithms/Sugiyama/DummyInsertion";
import VertexOrdering from "./algorithms/Sugiyama/VertexOrdering";
import CoordinateAssignment from "./algorithms/Sugiyama/CoordinateAssignment";


export default {
  __init__: [
    "algorithmSelector",
    "graphExtractor",
    "layoutApplier",
    "autoLayoutService",
    "sugiyamaLayoutAlgorithm",
    "cycleRemoval",
    "layerAssignment",
    "dummyInsertion",
    "vertexOrdering",
    "coordinateAssigment",
  ],
  autoLayoutService: ["type", AutoLayoutService],
  graphExtractor: ["type", GraphExtractor],
  layoutApplier: ["type", LayoutApplier],
  algorithmSelector: ["type", AlgorithmSelector],
  sugiyamaLayoutAlgorithm: ["type",Sugiyama],
  cycleRemoval: ["type", CycleRemoval],
  layerAssignment: ["type", LayerAssignment],
  dummyInsertion: ["type", DummyInsertion],
  vertexOrdering: ["type", VertexOrdering],
  coordinateAssigment: ["type", CoordinateAssignment],
};

import AutoLayoutService from "./AutoLayoutService.js";
import GraphExtractor from "./GraphExtractor.js";
import LayoutApplier from "./LayoutApplier.js";
import AlgorithmSelector from "./AlgorithmSelector.js";
import ObjectCentric from "./algorithm/ObjectCentric.js";

export default {
  __init__: [
    "objectCentricAlgorithm",
    "algorithmSelector",
    "graphExtractor",
    "layoutApplier",
    "autoLayoutService"
  ],
  autoLayoutService: ["type", AutoLayoutService],
  graphExtractor: ["type", GraphExtractor],
  layoutApplier: ["type", LayoutApplier],
  algorithmSelector: ["type", AlgorithmSelector],
  objectCentricAlgorithm: ["type", ObjectCentric]
};

import Auto from "../../lib/features/auto-layout/algorithms/Auto.js";
import ModularLayout from "../../lib/features/auto-layout/algorithms/Auto/ModularLayout.js";
import StructureDetector from "../../lib/features/auto-layout/algorithms/Auto/StructureDetector.js";
import GraphAnalysis from "../../lib/features/auto-layout/algorithms/Auto/detection/GraphAnalysis.js";
import StructurePostProcessor from "../../lib/features/auto-layout/algorithms/Auto/detection/StructurePostProcessor.js";
import StructureSequenceFiller from "../../lib/features/auto-layout/algorithms/Auto/detection/StructureSequenceFiller.js";
import StructureTreeBuilder from "../../lib/features/auto-layout/algorithms/Auto/detection/StructureTreeBuilder.js";
import BranchDetector from "../../lib/features/auto-layout/algorithms/Auto/detection/detectors/BranchDetector.js";
import ComplexDetector from "../../lib/features/auto-layout/algorithms/Auto/detection/detectors/ComplexDetector.js";
import CycleDetector from "../../lib/features/auto-layout/algorithms/Auto/detection/detectors/CycleDetector.js";
import SequenceDetector from "../../lib/features/auto-layout/algorithms/Auto/detection/detectors/SequenceDetector.js";
import BlockLayoutComposer from "../../lib/features/auto-layout/algorithms/Auto/layout/BlockLayoutComposer.js";
import BranchRegionLayout from "../../lib/features/auto-layout/algorithms/Auto/layout/BranchRegionLayout.js";
import CycleRegionLayout from "../../lib/features/auto-layout/algorithms/Auto/layout/CycleRegionLayout.js";
import LayoutGeometry from "../../lib/features/auto-layout/algorithms/Auto/layout/LayoutGeometry.js";
import LayoutGraph from "../../lib/features/auto-layout/algorithms/Auto/layout/LayoutGraph.js";
import Circular from "../../lib/features/auto-layout/algorithms/Circular.js";
import CircularEdgeRouting from "../../lib/features/auto-layout/algorithms/Circular/EdgeRouting.js";
import CircularGraphClassifier from "../../lib/features/auto-layout/algorithms/Circular/GraphClassifier.js";
import CircularBlockLayout from "../../lib/features/auto-layout/algorithms/Circular/MultiCircle/BlockLayout.js";
import CircularComposition from "../../lib/features/auto-layout/algorithms/Circular/MultiCircle/Composition.js";
import CircularDecomposition from "../../lib/features/auto-layout/algorithms/Circular/MultiCircle/Decomposition.js";
import CircularPlacement from "../../lib/features/auto-layout/algorithms/Circular/MultiCircle/Placement.js";
import CircularPreparation from "../../lib/features/auto-layout/algorithms/Circular/MultiCircle/Preparation.js";
import CircularCirclePlacement from "../../lib/features/auto-layout/algorithms/Circular/SingleCircle/CirclePlacement.js";
import CircularInsertion from "../../lib/features/auto-layout/algorithms/Circular/SingleCircle/Insertion.js";
import CircularOrdering from "../../lib/features/auto-layout/algorithms/Circular/SingleCircle/Ordering.js";
import CircularPostprocessing from "../../lib/features/auto-layout/algorithms/Circular/SingleCircle/Postprocessing.js";
import CircularReduction from "../../lib/features/auto-layout/algorithms/Circular/SingleCircle/Reduction.js";
import Sugiyama from "../../lib/features/auto-layout/algorithms/Sugiyama.js";
import CoordinateAssignment from "../../lib/features/auto-layout/algorithms/Sugiyama/CoordinateAssignment.js";
import CycleRemoval from "../../lib/features/auto-layout/algorithms/Sugiyama/CycleRemoval.js";
import DummyInsertion from "../../lib/features/auto-layout/algorithms/Sugiyama/DummyInsertion.js";
import EdgeRouting from "../../lib/features/auto-layout/algorithms/Sugiyama/EdgeRouting.js";
import LayerAssignment from "../../lib/features/auto-layout/algorithms/Sugiyama/LayerAssignment.js";
import VertexOrdering from "../../lib/features/auto-layout/algorithms/Sugiyama/VertexOrdering.js";

function buildSugiyama() {
  return new Sugiyama(
    new CycleRemoval(),
    new LayerAssignment(),
    new DummyInsertion(),
    new VertexOrdering(),
    new CoordinateAssignment(),
    new EdgeRouting()
  );
}

function buildCircular(sugiyama) {
  const reduction = new CircularReduction();
  const ordering = new CircularOrdering();
  const insertion = new CircularInsertion();
  const circlePlacement = new CircularCirclePlacement();
  const postprocessing = new CircularPostprocessing();

  return new Circular(
    new CircularGraphClassifier(),
    reduction,
    ordering,
    insertion,
    circlePlacement,
    postprocessing,
    new CircularEdgeRouting(),
    sugiyama,
    new CircularDecomposition(),
    new CircularPreparation(),
    new CircularBlockLayout(
      reduction,
      ordering,
      insertion,
      circlePlacement,
      postprocessing
    ),
    new CircularPlacement(),
    new CircularComposition()
  );
}

export function buildAuto() {
  const sugiyama = buildSugiyama();
  const circular = buildCircular(sugiyama);
  const geometry = new LayoutGeometry();
  const graph = new LayoutGraph();
  const composer = new BlockLayoutComposer(geometry);
  const detector = new StructureDetector(
    new GraphAnalysis(),
    new CycleDetector(),
    new ComplexDetector(),
    new BranchDetector(),
    new StructureTreeBuilder(),
    new StructureSequenceFiller(new SequenceDetector()),
    new StructurePostProcessor()
  );
  const modularLayout = new ModularLayout(
    sugiyama,
    new CycleRegionLayout(circular, geometry, graph),
    new BranchRegionLayout(geometry, graph, composer),
    composer,
    geometry,
    graph
  );

  return new Auto(detector, modularLayout, new EdgeRouting());
}

export function cloneGraph(source) {
  return {
    nodes: source.nodes.map((node) => ({ ...node })),
    edges: source.edges.map((edge) => ({ ...edge }))
  };
}

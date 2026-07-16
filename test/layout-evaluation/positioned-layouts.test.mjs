import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, relative, resolve } from "node:path";
import test from "node:test";

import {
  BENCHMARK_MODELS,
  LAYOUT_DIRECTORIES
} from "./benchmark-models.mjs";
import { asArray, loadPositionedPnml, readPnmlGraph } from "./pnml.mjs";

const TEST_ROOT = dirname(fileURLToPath(import.meta.url));

function nodeDefinition(node) {
  return {
    id: node.id,
    type: node.type,
    width: node.width,
    height: node.height
  };
}

function edgeDefinition(edge) {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target
  };
}

function byId(left, right) {
  return left.id.localeCompare(right.id);
}

for (const model of BENCHMARK_MODELS) {
  test(`${model.id} layouts retain the source topology and node dimensions`, async (t) => {
    const sourceFile = resolve(TEST_ROOT, "../..", model.source);
    const source = await readPnmlGraph(sourceFile);
    const expectedNodes = source.nodes.map(nodeDefinition).sort(byId);
    const expectedEdges = source.edges.map(edgeDefinition).sort(byId);

    for (const directory of LAYOUT_DIRECTORIES) {
      const layoutFile = resolve(
        TEST_ROOT,
        `positioned-pnmls/${directory}/${model.id}.pnml`
      );

      await t.test(relative(TEST_ROOT, layoutFile), async () => {
        const layout = await loadPositionedPnml(layoutFile);

        assert.deepEqual(layout.nodes.map(nodeDefinition).sort(byId), expectedNodes);
        assert.deepEqual(layout.edges.map(edgeDefinition).sort(byId), expectedEdges);
      });
    }
  });
}

test("Spotify Graphviz fixtures retain the expected spline routes", async () => {
  const expectations = [
    ["graphviz/sugiyama/straight", false],
    ["graphviz/sugiyama/routed", true],
    ["graphviz/circular", true],
    ["graphviz/force-directed", true]
  ];

  for (const [directory, routed] of expectations) {
    const file = resolve(
      TEST_ROOT,
      `positioned-pnmls/${directory}/real-spotify-cares.pnml`
    );
    const graph = await readPnmlGraph(file);
    const routeSizes = graph.arcs.map((arc) =>
      asArray(arc.graphics?.position).length
    );

    if (routed) {
      assert.equal(routeSizes.filter((size) => size > 0).length, graph.edges.length);
      assert.ok(routeSizes.every((size) => size >= 13 && size % 12 === 1));
    } else {
      assert.ok(routeSizes.every((size) => size === 0));
    }
  }
});

test("parallel cycle lanes fixture matches the linked Graphviz FDP layout", async () => {
  const file = resolve(
    TEST_ROOT,
    "positioned-pnmls/graphviz/force-directed/parallel-cycle-lanes.pnml"
  );
  const layout = await loadPositionedPnml(file);
  const positions = Object.fromEntries(
    layout.nodes.map((node) => [node.id, [node.x, node.y]])
  );

  assert.deepEqual(positions, {
    p_start: [227.12, 139.35],
    p_end: [964.85, 138.22],
    p_a0: [421.73, 109.97],
    p_a_out: [709.99, 76.94],
    p_b0: [398.51, 402.74],
    p_b1: [648.47, 569.67],
    p_b2: [608.72, 581.12],
    p_b_out: [814.21, 338.7],
    p_c0: [240.08, 305.12],
    p_c1: [40.12, 468.71],
    p_c2: [311.09, 436.17],
    p_c3: [538.04, 247.05],
    p_c_out: [799.53, 137.86],
    t_split: [282.43, 222.52],
    t_a_work: [520.77, 40.12],
    t_b_check: [484.94, 471.25],
    t_b_review: [633.64, 682.8],
    t_b_repeat: [415.49, 534.47],
    t_b_exit: [684.1, 475.05],
    t_c_check: [54.469, 345.36],
    t_c_review: [119.64, 486.33],
    t_c_verify: [393.91, 346.44],
    t_c_repeat: [352.86, 284.34],
    t_c_exit: [619.11, 177.71],
    t_join: [785.51, 177.58]
  });

  const graph = await readPnmlGraph(file);
  assert.ok(
    graph.arcs.every((arc) => {
      const routeSize = asArray(arc.graphics?.position).length;
      return routeSize >= 13 && routeSize % 12 === 1;
    })
  );
});

import assert from "node:assert/strict";
import test from "node:test";

import { parsePnmlGraph, parsePositionedPnml } from "./pnml.mjs";

const positionedPnml = `<?xml version="1.0" encoding="UTF-8"?>
<pnml>
  <net id="net1">
    <page id="page1">
      <place id="p1">
        <graphics>
          <position x="10" y="20" />
          <dimension x="30" y="30" />
        </graphics>
      </place>
      <transition id="t1">
        <graphics>
          <position x="100" y="40" />
          <dimension x="40" y="50" />
        </graphics>
      </transition>
      <arc id="a1" source="p1" target="t1">
        <graphics>
          <position x="70" y="80" />
        </graphics>
      </arc>
    </page>
  </net>
</pnml>`;

test("loads top-left node geometry and straight edges", () => {
  const layout = parsePositionedPnml(positionedPnml);

  assert.equal(layout.nodes.length, 2);
  assert.deepEqual(layout.nodes.find((node) => node.id === "p1"), {
    id: "p1",
    type: "place",
    label: "p1",
    x: 10,
    y: 20,
    width: 30,
    height: 30
  });
  assert.deepEqual(layout.edges[0].points, [
    { x: 25, y: 35 },
    { x: 120, y: 65 }
  ]);
});

test("includes saved arc waypoints in routed mode", () => {
  const layout = parsePositionedPnml(positionedPnml, { edgeMode: "routed" });

  assert.deepEqual(layout.edges[0].points, [
    { x: 25, y: 35 },
    { x: 70, y: 80 },
    { x: 120, y: 65 }
  ]);
});

test("reads topology without requiring node positions", () => {
  const graph = parsePnmlGraph(
    `<pnml><net id="n"><page id="p"><place id="p1"/><transition id="t1"/>` +
    `<arc id="a1" source="p1" target="t1"/></page></net></pnml>`
  );

  assert.deepEqual(graph.nodes.map((node) => node.id), ["p1", "t1"]);
  assert.deepEqual(graph.edges, [{ id: "a1", source: "p1", target: "t1" }]);
});

test("rejects PNML without positioned nodes", () => {
  const pnml = `<pnml><net id="n"><page id="p"><place id="p1" /></page></net></pnml>`;

  assert.throws(
    () => parsePositionedPnml(pnml, { sourceName: "unpositioned.pnml" }),
    /Save a positioned layout before evaluating it/
  );
});

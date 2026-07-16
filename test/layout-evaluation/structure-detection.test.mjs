import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import test from "node:test";

import { loadPositionedPnml } from "./pnml.mjs";
import { evaluateSplitJoinBalance } from "./metrics/vr5-split-join-balance.mjs";
import { evaluateCycleCircularity } from "./metrics/vr6-cycle-circularity.mjs";

const TEST_ROOT = dirname(fileURLToPath(import.meta.url));
const MODEL_23 = resolve(TEST_ROOT, "positioned-pnmls/auto/model-23.pnml");

test("model 23 has the expected automatically detected structures", async () => {
  const layout = await loadPositionedPnml(MODEL_23);
  const vr5 = evaluateSplitJoinBalance(layout);
  const vr6 = evaluateCycleCircularity(layout);

  assert.deepEqual(
    vr5.details.blocks.map((block) => `${block.splitNodeId}->${block.joinNodeId}`),
    ["p2->p4", "t5->t6"]
  );
  assert.deepEqual(
    vr6.details.cycles.map((cycle) => cycle.nodeIds.join("->")),
    ["p2->t2->p4->t8", "p2->t4->p4->t8"]
  );
});

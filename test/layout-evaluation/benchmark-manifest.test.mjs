import assert from "node:assert/strict";
import test from "node:test";

import {
  annotationsForModel,
  parseBenchmarkManifest
} from "./benchmark-manifest.mjs";

test("indexes annotation records by model identifier", () => {
  const manifest = parseBenchmarkManifest(JSON.stringify({
    models: [{
      modelId: "example",
      flowExcludedEdgeIds: ["return"]
    }]
  }));

  assert.deepEqual(annotationsForModel(manifest, "example").flowExcludedEdgeIds, ["return"]);
});

test("rejects duplicate model records", () => {
  const record = { modelId: "example", flowExcludedEdgeIds: [] };

  assert.throws(
    () => parseBenchmarkManifest(JSON.stringify({ models: [record, record] })),
    /duplicate modelId/
  );
});

test("requires an annotation record when a manifest is in use", () => {
  const manifest = parseBenchmarkManifest(JSON.stringify({ models: [] }));

  assert.throws(() => annotationsForModel(manifest, "missing"), /no annotation record/);
});

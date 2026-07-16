import { readFile } from "node:fs/promises";

export function parseBenchmarkManifest(contents, sourceName = "benchmark manifest") {
  let document;

  try {
    document = JSON.parse(contents);
  } catch (error) {
    throw new Error(`${sourceName} is not valid JSON: ${error.message}`);
  }

  if (!Array.isArray(document.models)) {
    throw new Error(`${sourceName} must contain a models array.`);
  }

  const records = new Map();

  for (const record of document.models) {
    if (!record || typeof record.modelId !== "string" || record.modelId.length === 0) {
      throw new Error(`${sourceName} contains a model without a modelId.`);
    }

    if (records.has(record.modelId)) {
      throw new Error(`${sourceName} contains duplicate modelId "${record.modelId}".`);
    }

    if (!Array.isArray(record.flowExcludedEdgeIds)) {
      throw new Error(
        `${sourceName} model "${record.modelId}" must define a flowExcludedEdgeIds array.`
      );
    }

    records.set(record.modelId, record);
  }

  return records;
}

export async function loadBenchmarkManifest(filePath) {
  return parseBenchmarkManifest(await readFile(filePath, "utf8"), filePath);
}

export function annotationsForModel(manifest, modelId) {
  if (!manifest) {
    return undefined;
  }

  const record = manifest.get(modelId);

  if (!record) {
    throw new Error(`Benchmark manifest has no annotation record for "${modelId}".`);
  }

  return record;
}

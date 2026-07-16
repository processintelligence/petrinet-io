#!/usr/bin/env node

import { arch, cpus, platform, release } from "node:os";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

import { BENCHMARK_MODELS } from "../layout-evaluation/benchmark-models.mjs";
import { readPnmlGraph } from "../layout-evaluation/pnml.mjs";
import { buildAuto, cloneGraph } from "./auto-layout-harness.mjs";

const SCRIPT_ROOT = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_ROOT, "../..");

export const DEFAULT_WARMUP_RUNS = 8;
export const DEFAULT_MEASURED_RUNS = 40;

function assertRunCount(value, name, { allowZero }) {
  if (!Number.isInteger(value) || value < (allowZero ? 0 : 1)) {
    const range = allowZero ? "a non-negative integer" : "a positive integer";
    throw new Error(`${name} must be ${range}.`);
  }
}

export function nearestRank(sortedValues, fraction) {
  if (!Array.isArray(sortedValues) || sortedValues.length === 0) {
    throw new Error("Cannot calculate a percentile without measured values.");
  }
  if (!Number.isFinite(fraction) || fraction <= 0 || fraction > 1) {
    throw new Error("Percentile fraction must be greater than 0 and at most 1.");
  }

  return sortedValues[
    Math.min(sortedValues.length - 1, Math.ceil(sortedValues.length * fraction) - 1)
  ];
}

export function summarizeDurations(durations) {
  const sorted = [...durations].sort((first, second) => first - second);

  if (sorted.some((duration) => !Number.isFinite(duration) || duration < 0)) {
    throw new Error("Measured durations must be finite, non-negative numbers.");
  }

  return {
    medianMs: nearestRank(sorted, 0.5),
    p95Ms: nearestRank(sorted, 0.95),
    minMs: sorted[0],
    maxMs: sorted.at(-1)
  };
}

export function measureAutoLayout({
  algorithm,
  source,
  warmupRuns = DEFAULT_WARMUP_RUNS,
  measuredRuns = DEFAULT_MEASURED_RUNS,
  now = () => performance.now()
}) {
  if (!algorithm || typeof algorithm.layout !== "function") {
    throw new Error("An Auto layout algorithm with a layout method is required.");
  }

  assertRunCount(warmupRuns, "warmupRuns", { allowZero: true });
  assertRunCount(measuredRuns, "measuredRuns", { allowZero: false });

  for (let index = 0; index < warmupRuns; index += 1) {
    algorithm.layout(cloneGraph(source));
  }

  const durations = [];

  for (let index = 0; index < measuredRuns; index += 1) {
    const start = now();
    algorithm.layout(cloneGraph(source));
    const duration = now() - start;

    if (!Number.isFinite(duration) || duration < 0) {
      throw new Error(`Invalid measured duration at run ${index + 1}: ${duration}.`);
    }

    durations.push(duration);
  }

  return {
    warmupRuns,
    measuredRuns,
    durationsMs: durations,
    ...summarizeDurations(durations)
  };
}

export async function benchmarkModel(model, options = {}) {
  const source = await readPnmlGraph(resolve(PROJECT_ROOT, model.source));
  const algorithm = (options.buildAlgorithm || buildAuto)();
  const timing = measureAutoLayout({
    algorithm,
    source,
    warmupRuns: options.warmupRuns,
    measuredRuns: options.measuredRuns,
    now: options.now
  });

  return {
    model: model.id,
    nodes: source.nodes.length,
    arcs: source.edges.length,
    ...timing
  };
}

export async function runBenchmark(models, options = {}) {
  const results = [];

  for (const model of models) {
    results.push(await benchmarkModel(model, options));
  }

  return {
    configuration: {
      warmupRuns: options.warmupRuns ?? DEFAULT_WARMUP_RUNS,
      measuredRuns: options.measuredRuns ?? DEFAULT_MEASURED_RUNS,
      timer: "performance.now",
      measuredCall: "algorithm.layout(cloneGraph(source))"
    },
    environment: {
      node: process.version,
      platform: `${platform()} ${release()} (${arch()})`,
      cpu: cpus()[0]?.model ?? "unknown"
    },
    results
  };
}

function parseRunCount(value, name, options) {
  const parsed = Number(value);
  assertRunCount(parsed, name, options);
  return parsed;
}

function printUsage() {
  console.log(`Usage:
  npm run benchmark:layout -- [options] [model-id ...]

With no model ID, all ten thesis benchmark models are measured.

Options:
  --warmups <count>  Warm-up executions per model (default: 8)
  --runs <count>     Measured executions per model (default: 40)
  --json             Print JSON including every duration (use npm --silent)
  --help             Show this help`);
}

function printTable(benchmark) {
  console.log(
    `Auto.layout runtime: ${benchmark.configuration.warmupRuns} warm-ups, ` +
    `${benchmark.configuration.measuredRuns} measured runs per model.`
  );
  console.log(
    `Environment: ${benchmark.environment.node}; ${benchmark.environment.cpu}; ` +
    benchmark.environment.platform
  );
  console.table(benchmark.results.map((result) => ({
    model: result.model,
    "nodes/arcs": `${result.nodes}/${result.arcs}`,
    "median (ms)": result.medianMs.toFixed(1),
    "p95 (ms)": result.p95Ms.toFixed(1),
    "min (ms)": result.minMs.toFixed(1),
    "max (ms)": result.maxMs.toFixed(1)
  })));
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      help: { type: "boolean", default: false },
      json: { type: "boolean", default: false },
      runs: { type: "string", default: String(DEFAULT_MEASURED_RUNS) },
      warmups: { type: "string", default: String(DEFAULT_WARMUP_RUNS) }
    }
  });

  if (values.help) {
    printUsage();
    return;
  }

  const warmupRuns = parseRunCount(values.warmups, "--warmups", { allowZero: true });
  const measuredRuns = parseRunCount(values.runs, "--runs", { allowZero: false });
  const modelById = new Map(BENCHMARK_MODELS.map((model) => [model.id, model]));
  const models = positionals.length === 0
    ? BENCHMARK_MODELS
    : positionals.map((modelId) => {
        const model = modelById.get(modelId);

        if (!model) {
          throw new Error(`Unknown benchmark model "${modelId}".`);
        }

        return model;
      });
  const benchmark = await runBenchmark(models, { warmupRuns, measuredRuns });

  if (values.json) {
    console.log(JSON.stringify(benchmark, null, 2));
  } else {
    printTable(benchmark);
  }
}

if (resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Layout benchmark failed: ${error.stack || error.message}`);
    process.exitCode = 1;
  });
}

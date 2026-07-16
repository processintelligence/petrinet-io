#!/usr/bin/env node

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import {
  annotationsForModel,
  loadBenchmarkManifest
} from "./benchmark-manifest.mjs";
import evaluateLayout from "./evaluate-layout.mjs";
import { loadPositionedPnml } from "./pnml.mjs";

const POSITIONED_ROOT = "test/layout-evaluation/positioned-pnmls/";
const LAYOUT_NAMES = new Map([
  ["auto", "Auto"],
  ["petrinet-io/sugiyama", "Auto Sugiyama"],
  ["graphviz/sugiyama/straight", "Graphviz dot (splines=false)"],
  ["graphviz/sugiyama/routed", "Graphviz dot (splines=true)"],
  ["graphviz/circular", "Graphviz circo (splines=true)"],
  ["graphviz/force-directed", "Graphviz fdp (splines=true)"],
  ["object-centric", "Object-centric"]
]);

function usage() {
  console.log(`Usage:
  npm run evaluate:layouts -- [options] [layout.pnml | directory ...]

With no path, every positioned PNML fixture is evaluated.

Options:
  --edge-mode <straight|routed>          Ignore or include saved arc waypoints
  --near-contact-distance <number>       VR4 diagnostic distance (default: 3)
  --vertical-edge-policy <policy>        deferred, strict, or non-backward
  --manifest <manifest.json>             VR3 annotations for multiple models
  --annotations <record.json>            VR3 annotations for one PNML file
  --details                              Print metric diagnostics for one file
  --json                                 Print machine-readable JSON
  --help                                 Show this help`);
}

async function collectPnmlFiles(inputPaths, excludedDirectories = new Set()) {
  const files = [];

  async function collectDirectory(directoryPath) {
    const entries = await readdir(directoryPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(directoryPath, entry.name);

      if (entry.isDirectory() && !excludedDirectories.has(entry.name)) {
        await collectDirectory(entryPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".pnml")) {
        files.push(entryPath);
      }
    }
  }

  for (const inputPath of inputPaths) {
    const absolutePath = path.resolve(process.cwd(), inputPath);
    const inputStat = await stat(absolutePath);

    if (inputStat.isDirectory()) {
      await collectDirectory(absolutePath);
    } else if (inputStat.isFile() && absolutePath.toLowerCase().endsWith(".pnml")) {
      files.push(absolutePath);
    } else {
      throw new Error(`Input is not a PNML file or directory: ${inputPath}`);
    }
  }

  return [...new Set(files)].sort((first, second) => first.localeCompare(second));
}

function relativeFile(filePath) {
  return path.relative(process.cwd(), filePath) || filePath;
}

function layoutIdentity(filePath) {
  const relativePath = relativeFile(filePath).split(path.sep).join("/");
  const positionedPath = relativePath.startsWith(POSITIONED_ROOT)
    ? relativePath.slice(POSITIONED_ROOT.length)
    : null;

  if (positionedPath) {
    for (const [directory, layout] of LAYOUT_NAMES) {
      const prefix = `${directory}/`;

      if (positionedPath.startsWith(prefix)) {
        return {
          layout,
          model: path.posix.basename(positionedPath.slice(prefix.length), ".pnml")
        };
      }
    }
  }

  return {
    layout: relativePath,
    model: path.basename(filePath, path.extname(filePath))
  };
}

function groupByModel(results) {
  const grouped = new Map();

  for (const result of results) {
    const modelResults = grouped.get(result.model) || [];
    modelResults.push(result);
    grouped.set(result.model, modelResults);
  }

  return [...grouped.entries()].sort(([first], [second]) => first.localeCompare(second));
}

function metricById(metrics, id) {
  return metrics.find((metric) => metric.id === id);
}

function summarize(file, identity, layout, metrics) {
  const vr1 = metricById(metrics, "VR1");
  const vr2 = metricById(metrics, "VR2");
  const vr3 = metricById(metrics, "VR3");
  const vr4 = metricById(metrics, "VR4");
  const vr5 = metricById(metrics, "VR5");
  const vr6 = metricById(metrics, "VR6");

  return {
    file: relativeFile(file),
    ...identity,
    status: "ok",
    nodes: layout.nodes.length,
    edges: layout.edges.length,
    nodeOverlapPassed: vr1.raw.passed,
    nodeClearanceViolations: vr1.raw.violatingPairCount,
    minimumNodeClearance: vr1.raw.minimumClearance,
    edgeNodeScore: vr2.score,
    affectedEdges: vr2.raw.affectedEdgeCount,
    processFlowScore: vr3.score,
    strictForwardScore: vr3.raw.strictForwardScore,
    nonBackwardScore: vr3.raw.nonBackwardScore,
    excludedFlowEdges: vr3.raw.excludedEdgeCount,
    backwardEdges: vr3.raw.backwardEdgeCount,
    crossingScore: vr4.score,
    affectedCrossingPairs: vr4.raw.affectedPairCount,
    properIntersections: vr4.raw.properIntersectionCount,
    overlapPairs: vr4.raw.overlapPairCount,
    nearContacts: vr4.raw.nearContactPairCount,
    eligiblePairs: vr4.raw.eligiblePairCount,
    minimumAngle: vr4.raw.minimumCrossingAngleDegrees,
    splitJoinScore: vr5.score,
    branchBlocks: vr5.raw.blockCount,
    cycleCircularityScore: vr6.score,
    cycles: vr6.raw.detectedCycleCount
  };
}

function formatScore(value) {
  return value === null || value === undefined ? "N/A" : value.toFixed(4);
}

function formatDistance(value) {
  return value === null ? "N/A" : value.toFixed(2);
}

function printMetric(metric) {
  const raw = metric.raw;
  const result = metric.id === "VR1"
    ? (raw.passed ? "PASS" : "FAIL")
    : formatScore(metric.score);

  console.log(`\n${metric.id} - ${metric.name}`);
  console.log(`  Applicable:                 ${metric.applicable ? "yes" : "no"}`);
  console.log(`  Authoritative result:       ${result}`);

  if (metric.id === "VR1") {
    console.log(`  Required clearance:         ${raw.minimumRequiredClearance.toFixed(2)}`);
    console.log(`  Minimum clearance:          ${formatDistance(raw.minimumClearance)}`);
    console.log(`  Clearance violations:       ${raw.violatingPairCount}`);
    for (const pair of metric.details.violatingPairs) {
      console.log(`    ${pair.firstNodeId} vs ${pair.secondNodeId}: ${pair.clearance.toFixed(2)} units`);
    }
  } else if (metric.id === "VR2") {
    console.log(`  Required clearance:         ${raw.minimumRequiredClearance.toFixed(2)}`);
    console.log(`  Affected edges:             ${raw.affectedEdgeCount}`);
    console.log(`  Compliant edges:            ${raw.compliantEdgeCount}`);
    console.log(`  Hidden edge length:         ${raw.totalHiddenLength.toFixed(2)}`);
    for (const edge of metric.details.affectedEdges) {
      console.log(
        `    ${edge.edgeId}: clearance ${formatDistance(edge.minimumClearance)}, ` +
        `hidden ${(edge.hiddenRatio * 100).toFixed(2)}%, nodes ${edge.violatingNodeIds.join(", ")}`
      );
    }
  } else if (metric.id === "VR3") {
    console.log(`  Measured edges:             ${raw.measuredEdgeCount}`);
    console.log(`  Excluded return edges:      ${raw.excludedEdgeCount}`);
    console.log(`  Forward / vertical / back:  ${raw.forwardEdgeCount} / ${raw.verticalEdgeCount} / ${raw.backwardEdgeCount}`);
    console.log(`  Strict-forward candidate:   ${formatScore(raw.strictForwardScore)}`);
    console.log(`  Non-backward candidate:     ${formatScore(raw.nonBackwardScore)}`);
    console.log(`  Selected policy:            ${raw.scorePolicy}`);
    for (const edge of metric.details.backwardEdges) {
      console.log(
        `    ${edge.edgeId}: ${edge.sourceNodeId} -> ${edge.targetNodeId} ` +
        `(${edge.sourceX.toFixed(2)} > ${edge.targetX.toFixed(2)})`
      );
    }
  } else if (metric.id === "VR4") {
    console.log(`  Eligible edge pairs:        ${raw.eligiblePairCount}`);
    console.log(`  Affected pairs:             ${raw.affectedPairCount}`);
    console.log(`  Proper intersections:       ${raw.properIntersectionCount}`);
    console.log(`  Collinear overlaps:         ${raw.overlapPairCount}`);
    console.log(`  Near contacts (diagnostic): ${raw.nearContactPairCount}`);
    console.log(`  Minimum crossing angle:     ${raw.minimumCrossingAngleDegrees === null ? "N/A" : `${raw.minimumCrossingAngleDegrees.toFixed(2)} degrees`}`);
    for (const pair of metric.details.affectedPairs) {
      const kinds = [
        pair.properIntersections.length > 0 ? "crossing" : null,
        pair.overlaps.length > 0 ? "overlap" : null
      ].filter(Boolean).join(" + ");
      console.log(`    ${pair.firstEdgeId} vs ${pair.secondEdgeId}: ${kinds}`);
    }
  } else if (metric.id === "VR5") {
    console.log(`  Branch blocks:              ${raw.blockCount}`);
    console.log(`  Axis result:                ${formatScore(raw.axisScore)}`);
    console.log(`  Entrance result:            ${formatScore(raw.entranceScore)}`);
    console.log(`  Exit result:                ${formatScore(raw.exitScore)}`);
    console.log(`  Branch-centre result:       ${formatScore(raw.branchCenterScore)}`);
    for (const block of metric.details.blocks) {
      console.log(
        `    ${block.splitNodeId} -> ${block.joinNodeId}: ` +
        block.branchPaths.map((branch) => branch.join(" -> ")).join(" | ")
      );
    }
  } else if (metric.id === "VR6") {
    console.log(`  Detected cycles:            ${raw.detectedCycleCount}`);
    for (const cycle of metric.details.cycles) {
      console.log(
        `    ${cycle.id}: circularity ${formatScore(cycle.score)}, ` +
        `radius ${formatDistance(cycle.fittedRadius)}, ` +
        `radial error ${formatDistance(cycle.radialRmse)}`
      );
    }
  }
}

function printTables(groupedResults, hasManifest) {
  const tableValue = (result, column) => {
    const value = result[column.key];

    if (value === undefined) {
      return "-";
    }
    if (column.type === "boolean") {
      return value ? "PASS" : "FAIL";
    }
    return column.type === "score" ? formatScore(value) : value ?? "-";
  };
  const tables = [
    ["VR1 - Node-overlap avoidance", [
      { label: "VR1 result", key: "nodeOverlapPassed", type: "boolean" },
      { label: "clearance violations", key: "nodeClearanceViolations" }
    ]],
    ["VR2 - Edge-node overlap avoidance", [
      { label: "VR2 result", key: "edgeNodeScore", type: "score" },
      { label: "affected edges", key: "affectedEdges" }
    ]],
    ["VR3 - Process-flow direction", [
      { label: "selected result", key: "processFlowScore", type: "score" },
      { label: "strict forward", key: "strictForwardScore", type: "score" },
      { label: "non-backward", key: "nonBackwardScore", type: "score" },
      { label: "excluded edges", key: "excludedFlowEdges" },
      { label: "backward edges", key: "backwardEdges" }
    ]],
    ["VR4 - Edge crossings", [
      { label: "VR4 result", key: "crossingScore", type: "score" },
      { label: "affected pairs", key: "affectedCrossingPairs" },
      { label: "intersections", key: "properIntersections" },
      { label: "overlap pairs", key: "overlapPairs" },
      { label: "near contacts", key: "nearContacts" }
    ]],
    ["VR5 - Split/join balance", [
      { label: "VR5 result", key: "splitJoinScore", type: "score" },
      { label: "branch blocks", key: "branchBlocks" }
    ]],
    ["VR6 - Cycle circularity", [
      { label: "VR6 result", key: "cycleCircularityScore", type: "score" },
      { label: "detected cycles", key: "cycles" }
    ]]
  ];

  if (!hasManifest) {
    console.log("No benchmark manifest supplied: VR3 has no return-edge exclusions.");
  }

  for (const [model, modelResults] of groupedResults) {
    const dimensions = modelResults.find((result) => result.status === "ok");
    const size = dimensions ? ` (${dimensions.nodes} nodes, ${dimensions.edges} edges)` : "";
    console.log(`\n=== Petri net: ${model}${size} ===`);

    for (const [title, columns] of tables) {
      console.log(`\n${title}`);
      console.table(modelResults.map((result) => Object.fromEntries([
        ["layout", result.layout],
        ...columns.map((column) => [column.label, tableValue(result, column)])
      ])));
    }

    for (const result of modelResults.filter((entry) => entry.status === "skipped")) {
      console.log(`Skipped ${result.file}: ${result.reason}`);
    }
  }
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    "edge-mode": { type: "string", default: "routed" },
    "near-contact-distance": { type: "string", default: "3" },
    "vertical-edge-policy": { type: "string", default: "deferred" },
    annotations: { type: "string" },
    details: { type: "boolean", default: false },
    help: { type: "boolean", default: false },
    json: { type: "boolean", default: false },
    manifest: { type: "string" }
  }
});

if (values.help) {
  usage();
  process.exit(0);
}

try {
  if (values.manifest && values.annotations) {
    throw new Error("Use either --manifest or --annotations, not both.");
  }

  const nearContactDistance = Number(values["near-contact-distance"]);

  if (!Number.isFinite(nearContactDistance) || nearContactDistance < 0) {
    throw new Error("--near-contact-distance must be a non-negative number.");
  }

  const usesDefaultDirectory = positionals.length === 0;
  const requestedPaths = usesDefaultDirectory
    ? ["test/layout-evaluation/positioned-pnmls"]
    : positionals;
  const files = await collectPnmlFiles(
    requestedPaths,
    usesDefaultDirectory ? new Set(["_validation"]) : new Set()
  );

  if (files.length === 0) {
    throw new Error("No PNML files found.");
  }
  if ((values.annotations || values.details) && files.length !== 1) {
    throw new Error("--annotations and --details can only be used with one PNML file.");
  }

  const manifest = values.manifest
    ? await loadBenchmarkManifest(path.resolve(process.cwd(), values.manifest))
    : null;
  const directAnnotations = values.annotations
    ? JSON.parse(await readFile(path.resolve(process.cwd(), values.annotations), "utf8"))
    : undefined;
  const results = [];
  let detailedEvaluation = null;

  for (const file of files) {
    const identity = layoutIdentity(file);

    try {
      const annotations = directAnnotations ?? annotationsForModel(manifest, identity.model);
      const layout = await loadPositionedPnml(file, { edgeMode: values["edge-mode"] });
      const metrics = evaluateLayout(layout, {
        annotations,
        nearContactDistance,
        verticalEdgePolicy: values["vertical-edge-policy"]
      });
      const summary = summarize(file, identity, layout, metrics);
      results.push(summary);
      detailedEvaluation = { summary, layout, metrics };
    } catch (error) {
      results.push({
        file: relativeFile(file),
        ...identity,
        status: "skipped",
        reason: error.message
      });
    }
  }

  const groupedResults = groupByModel(results);

  if (values.json) {
    console.log(JSON.stringify({
      edgeMode: values["edge-mode"],
      manifest: values.manifest ?? null,
      annotations: values.annotations ?? null,
      nearContactDistance,
      verticalEdgePolicy: values["vertical-edge-policy"],
      petriNets: groupedResults.map(([model, modelResults]) => ({
        model,
        results: modelResults
      })),
      metrics: values.details ? detailedEvaluation?.metrics ?? null : undefined
    }, null, 2));
  } else if (values.details && detailedEvaluation) {
    console.log(`Layout: ${detailedEvaluation.summary.file}`);
    console.log(`Edge mode: ${detailedEvaluation.layout.edgeMode}`);
    console.log(`Nodes: ${detailedEvaluation.layout.nodes.length}`);
    console.log(`Edges: ${detailedEvaluation.layout.edges.length}`);
    for (const metric of detailedEvaluation.metrics) {
      printMetric(metric);
    }
    console.log("\nVR1 is a validity gate; the remaining results form a profile, not an overall score.");
  } else {
    printTables(groupedResults, Boolean(manifest || directAnnotations));
  }
} catch (error) {
  console.error(`Evaluation failed: ${error.message}`);
  process.exitCode = 1;
}

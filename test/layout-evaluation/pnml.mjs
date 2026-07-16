import { readFile } from "node:fs/promises";

import { XMLParser, XMLValidator } from "fast-xml-parser";

const DEFAULT_DIMENSIONS = {
  place: { width: 50, height: 50 },
  transition: { width: 70, height: 70 }
};

const parser = new XMLParser({
  attributeNamePrefix: "",
  ignoreAttributes: false,
  parseAttributeValue: false,
  removeNSPrefix: true,
  trimValues: true
});

export function asArray(value) {
  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function collectElements(value, tagName, result = []) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectElements(item, tagName, result);
    }
    return result;
  }

  if (!value || typeof value !== "object") {
    return result;
  }

  for (const [key, child] of Object.entries(value)) {
    if (key === tagName) {
      result.push(...asArray(child).filter((item) => item && typeof item === "object"));
    }
    collectElements(child, tagName, result);
  }

  return result;
}

function firstObject(value) {
  return asArray(value).find((item) => item && typeof item === "object");
}

function finiteNumber(value) {
  const number = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(number) ? number : null;
}

function textValue(value) {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

function nodeFromElement(element, type) {
  if (!element.id) {
    throw new Error(`PNML contains a ${type} without an id.`);
  }

  const graphics = firstObject(element.graphics);
  const position = firstObject(graphics?.position);
  const dimension = firstObject(graphics?.dimension);
  const defaults = DEFAULT_DIMENSIONS[type];

  return {
    id: String(element.id),
    type,
    label: textValue(firstObject(element.name)?.text) || String(element.id),
    x: finiteNumber(position?.x),
    y: finiteNumber(position?.y),
    width: finiteNumber(dimension?.x) ?? defaults.width,
    height: finiteNumber(dimension?.y) ?? defaults.height
  };
}

function assertUniqueIds(items, itemType) {
  const seen = new Set();

  for (const item of items) {
    if (seen.has(item.id)) {
      throw new Error(`PNML contains duplicate ${itemType} id "${item.id}".`);
    }
    seen.add(item.id);
  }
}

function parseDocument(pnml) {
  const validation = XMLValidator.validate(pnml);

  if (validation !== true) {
    const line = validation.err?.line ? ` at line ${validation.err.line}` : "";
    throw new Error(`Invalid PNML${line}: ${validation.err?.msg || "XML validation failed"}`);
  }

  return parser.parse(pnml);
}

export function parsePnmlGraph(pnml, options = {}) {
  const sourceName = options.sourceName ?? "PNML input";
  const document = parseDocument(pnml);
  const pages = collectElements(document, "page");
  const places = pages.flatMap((page) => asArray(page.place));
  const transitions = pages.flatMap((page) => asArray(page.transition));
  const arcs = pages.flatMap((page) => asArray(page.arc));
  const nodes = [
    ...places.map((place) => nodeFromElement(place, "place")),
    ...transitions.map((transition) => nodeFromElement(transition, "transition"))
  ];

  if (nodes.length === 0) {
    throw new Error(`${sourceName} does not contain any PNML places or transitions.`);
  }

  const edges = arcs.map((arc) => {
    if (!arc.id) {
      throw new Error("PNML contains an arc without an id.");
    }

    return {
      id: String(arc.id),
      source: String(arc.source ?? ""),
      target: String(arc.target ?? "")
    };
  });

  assertUniqueIds(nodes, "node");
  assertUniqueIds(edges, "arc");

  const nodeIds = new Set(nodes.map((node) => node.id));

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      throw new Error(
        `Arc "${edge.id}" references missing endpoint(s): ` +
        `source="${edge.source}", target="${edge.target}".`
      );
    }
  }

  return { document, places, transitions, arcs, nodes, edges };
}

export async function readPnmlGraph(filePath) {
  const pnml = await readFile(filePath, "utf8");
  return parsePnmlGraph(pnml, { sourceName: filePath });
}

function centerOf(node) {
  return {
    x: node.x + node.width / 2,
    y: node.y + node.height / 2
  };
}

function parseWaypoints(arc) {
  const graphics = firstObject(arc.graphics);

  return asArray(graphics?.position).map((position, index) => {
    const x = finiteNumber(position?.x);
    const y = finiteNumber(position?.y);

    if (x === null || y === null) {
      throw new Error(`Arc "${arc.id}" has an invalid waypoint at index ${index}.`);
    }

    return { x, y };
  });
}

export function parsePositionedPnml(pnml, options = {}) {
  const edgeMode = options.edgeMode ?? "straight";
  const sourceName = options.sourceName ?? "PNML input";

  if (edgeMode !== "straight" && edgeMode !== "routed") {
    throw new Error(`Unknown edge mode "${edgeMode}". Use "straight" or "routed".`);
  }

  const graph = parsePnmlGraph(pnml, { sourceName });
  const unpositionedNodes = graph.nodes.filter(
    (node) => node.x === null || node.y === null
  );

  if (unpositionedNodes.length > 0) {
    const examples = unpositionedNodes.slice(0, 5).map((node) => node.id).join(", ");
    const remainder = unpositionedNodes.length > 5
      ? ` and ${unpositionedNodes.length - 5} more`
      : "";

    throw new Error(
      `${sourceName} has ${unpositionedNodes.length} node(s) without a finite graphics position: ` +
      `${examples}${remainder}. Save a positioned layout before evaluating it.`
    );
  }

  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const edges = graph.edges.map((edge, index) => ({
    ...edge,
    points: [
      centerOf(nodeById.get(edge.source)),
      ...(edgeMode === "routed" ? parseWaypoints(graph.arcs[index]) : []),
      centerOf(nodeById.get(edge.target))
    ]
  }));

  return {
    sourceName,
    coordinateConvention: "top-left node positions",
    edgeMode,
    nodes: graph.nodes,
    edges
  };
}

export async function loadPositionedPnml(filePath, options = {}) {
  const pnml = await readFile(filePath, "utf8");
  return parsePositionedPnml(pnml, {
    ...options,
    sourceName: options.sourceName ?? filePath
  });
}

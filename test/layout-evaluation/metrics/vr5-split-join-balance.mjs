import { centerOf, EPSILON } from "./geometry.mjs";
import { analyzeGraph, findBranchBlocks } from "./graph-structure.mjs";

function reflectionScore(verticalPositions, axisY, blockHeight) {
  const offsets = verticalPositions
    .map((position) => position - axisY)
    .sort((first, second) => first - second);
  const imbalance = offsets.reduce((sum, offset, index) => (
    sum + Math.abs(offset + offsets[offsets.length - 1 - index])
  ), 0);

  return 1 - Math.min(1, imbalance / (offsets.length * blockHeight));
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function evaluateBlock(block, nodeById) {
  const split = nodeById.get(block.splitNodeId);
  const join = nodeById.get(block.joinNodeId);
  const blockNodes = block.nodeIds.map((nodeId) => nodeById.get(nodeId));
  const minimumY = Math.min(...blockNodes.map((node) => node.y));
  const maximumY = Math.max(...blockNodes.map((node) => node.y + node.height));
  const blockHeight = Math.max(EPSILON, maximumY - minimumY);
  const splitY = centerOf(split).y;
  const joinY = centerOf(join).y;
  const axisY = (splitY + joinY) / 2;
  const entranceYs = block.firstNodeIds.map((nodeId) => centerOf(nodeById.get(nodeId)).y);
  const exitYs = block.lastNodeIds.map((nodeId) => centerOf(nodeById.get(nodeId)).y);
  const branchEnvelopes = block.branchPaths.map((path) => {
    const branchNodes = path.slice(0, -1).map((nodeId) => nodeById.get(nodeId));

    const top = Math.min(...branchNodes.map((node) => node.y));
    const bottom = Math.max(...branchNodes.map((node) => node.y + node.height));

    return { top, bottom, centerY: (top + bottom) / 2 };
  });
  const branchCenterYs = branchEnvelopes.map((envelope) => envelope.centerY);
  const axisScore = 1 - Math.min(1, Math.abs(splitY - joinY) / blockHeight);
  const entranceScore = reflectionScore(entranceYs, axisY, blockHeight);
  const exitScore = reflectionScore(exitYs, axisY, blockHeight);
  const branchCenterScore = reflectionScore(branchCenterYs, axisY, blockHeight);

  return {
    ...block,
    blockHeight,
    axisY,
    branchEnvelopes,
    axisScore,
    entranceScore,
    exitScore,
    branchCenterScore,
    summaryScore: mean([axisScore, entranceScore, exitScore, branchCenterScore])
  };
}

export function evaluateSplitJoinBalance(layout) {
  const analysis = analyzeGraph(layout);
  const blocks = findBranchBlocks(analysis).map((block) => (
    evaluateBlock(block, analysis.nodeById)
  ));
  const applicable = blocks.length > 0;
  const componentMean = (key) => applicable ? mean(blocks.map((block) => block[key])) : null;

  return {
    id: "VR5",
    name: "Split/join balance",
    applicable,
    score: componentMean("summaryScore"),
    raw: {
      blockCount: blocks.length,
      axisScore: componentMean("axisScore"),
      entranceScore: componentMean("entranceScore"),
      exitScore: componentMean("exitScore"),
      branchCenterScore: componentMean("branchCenterScore")
    },
    details: { blocks }
  };
}

export default evaluateSplitJoinBalance;

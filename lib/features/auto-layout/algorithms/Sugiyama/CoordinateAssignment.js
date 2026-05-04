export default class CoordinateAssignment {

    /**
     * Implements the paper's LP objective in the current LR orientation:
     * layer determines x, while the optimized coordinate is the y-center.
     *
     * Objective:
     *   min Σ Ω(e) * |y(source) - y(target)|
     *
     * Constraints:
     *   y(b) - y(a) >= rho(a, b) for consecutive vertices a, b in the same layer
     *
     * We do not have an LP solver in this repo, so we solve the exact objective
     * numerically with projected subgradient descent and Euclidean projection
     * onto the layer separation constraints.
     */
    constructor() {
        this.startX = 100;
        this.startY = 100;
        this.layerSpacing = 140;
        this.vertexSep = 40;
        this.maxIterations = 240;
        this.initialStep = 14;
        this.minStep = 0.15;
        this.tolerance = 0.05;
        this.zeroTolerance = 0.001;
    }

    assignCoordinates(petriNet) {
        const layers = this.groupByLayers(petriNet.nodes);
        const orderedLayers = layers.map((layer) => this.sortLayer(layer));
        const nodeById = new Map(petriNet.nodes.map((node) => [node.id, node]));
        const centersByNodeId = this.computeLpCenters(orderedLayers, petriNet.edges, nodeById);

        const topByNodeId = new Map();

        for (const node of petriNet.nodes) {
            const centerY = centersByNodeId.get(node.id) ?? 0;
            topByNodeId.set(node.id, centerY - this.getNodeHeight(node) / 2);
        }

        const minTop = this.getMinimumTop(topByNodeId);
        const verticalShift = this.startY - minTop;

        petriNet.nodes = petriNet.nodes.map((node) => {
            const layer = Number.isFinite(node.layer) ? node.layer : 0;
            const top = topByNodeId.get(node.id) ?? 0;

            return {
                ...node,
                x: this.startX + layer * this.layerSpacing,
                y: top + verticalShift
            };
        });

        petriNet.layers = orderedLayers;

        return petriNet;
    }

    computeLpCenters(layers, edges, nodeById) {
        const centersByNodeId = this.createInitialCenters(layers);

        for (let iteration = 0; iteration < this.maxIterations; iteration++) {
            const gradientByNodeId = this.computeEdgeGradient(edges, centersByNodeId, nodeById);
            const step = Math.max(this.minStep, this.initialStep / Math.sqrt(iteration + 1));

            let maxDelta = 0;

            for (const [nodeId, gradient] of gradientByNodeId.entries()) {
                const previousValue = centersByNodeId.get(nodeId) ?? 0;
                const nextValue = previousValue - step * gradient;

                centersByNodeId.set(nodeId, nextValue);
                maxDelta = Math.max(maxDelta, Math.abs(nextValue - previousValue));
            }

            this.projectAllLayers(layers, centersByNodeId);
            this.centerDrawing(centersByNodeId);

            if (maxDelta < this.tolerance) {
                break;
            }
        }

        return centersByNodeId;
    }

    createInitialCenters(layers) {
        const centersByNodeId = new Map();

        for (const layer of layers) {
            let cursor = 0;
            const layerHeights = layer.reduce((sum, node) => sum + this.getNodeHeight(node), 0);
            const layerGaps = layer.length > 1 ? (layer.length - 1) * this.vertexSep : 0;
            const layerStart = -((layerHeights + layerGaps) / 2);

            cursor = layerStart;

            for (const node of layer) {
                const nodeHeight = this.getNodeHeight(node);
                const center = cursor + nodeHeight / 2;

                centersByNodeId.set(node.id, center);
                cursor += nodeHeight + this.vertexSep;
            }
        }

        return centersByNodeId;
    }

    computeEdgeGradient(edges, centersByNodeId, nodeById) {
        const gradientByNodeId = new Map();

        for (const nodeId of centersByNodeId.keys()) {
            gradientByNodeId.set(nodeId, 0);
        }

        for (const edge of edges) {
            const sourceCenter = centersByNodeId.get(edge.source);
            const targetCenter = centersByNodeId.get(edge.target);

            if (!Number.isFinite(sourceCenter) || !Number.isFinite(targetCenter)) {
                continue;
            }

            const delta = targetCenter - sourceCenter;
            const absDelta = Math.abs(delta);

            if (absDelta <= this.zeroTolerance) {
                continue;
            }

            const weight = this.getEdgeWeight(edge, nodeById);
            const direction = delta > 0 ? 1 : -1;

            gradientByNodeId.set(edge.source, (gradientByNodeId.get(edge.source) ?? 0) - weight * direction);
            gradientByNodeId.set(edge.target, (gradientByNodeId.get(edge.target) ?? 0) + weight * direction);
        }

        return gradientByNodeId;
    }

    projectAllLayers(layers, centersByNodeId) {
        for (const layer of layers) {
            if (layer.length <= 1) {
                continue;
            }

            const offsets = this.buildLayerOffsets(layer);
            const unconstrained = layer.map((node, index) => (
                (centersByNodeId.get(node.id) ?? 0) - offsets[index]
            ));
            const projected = this.isotonicRegression(unconstrained);

            layer.forEach((node, index) => {
                centersByNodeId.set(node.id, projected[index] + offsets[index]);
            });
        }
    }

    buildLayerOffsets(layer) {
        const offsets = [0];

        for (let index = 1; index < layer.length; index++) {
            const previous = layer[index - 1];
            const current = layer[index];
            const previousOffset = offsets[index - 1];

            offsets.push(previousOffset + this.getMinimumSeparation(previous, current));
        }

        return offsets;
    }

    isotonicRegression(values) {
        const blocks = [];

        values.forEach((value, index) => {
            blocks.push({
                start: index,
                end: index,
                weight: 1,
                average: value
            });

            while (blocks.length >= 2) {
                const last = blocks[blocks.length - 1];
                const prev = blocks[blocks.length - 2];

                if (prev.average <= last.average) {
                    break;
                }

                const mergedWeight = prev.weight + last.weight;
                const mergedAverage =
                    ((prev.average * prev.weight) + (last.average * last.weight)) / mergedWeight;

                blocks.splice(blocks.length - 2, 2, {
                    start: prev.start,
                    end: last.end,
                    weight: mergedWeight,
                    average: mergedAverage
                });
            }
        });

        const projected = new Array(values.length);

        for (const block of blocks) {
            for (let index = block.start; index <= block.end; index++) {
                projected[index] = block.average;
            }
        }

        return projected;
    }

    centerDrawing(centersByNodeId) {
        const values = [...centersByNodeId.values()];

        if (values.length === 0) {
            return;
        }

        const mean = values.reduce((sum, value) => sum + value, 0) / values.length;

        for (const [nodeId, value] of centersByNodeId.entries()) {
            centersByNodeId.set(nodeId, value - mean);
        }
    }

    getEdgeWeight(edge, nodeById) {
        const sourceNode = nodeById.get(edge.source);
        const targetNode = nodeById.get(edge.target);
        const sourceDummy = sourceNode?.type === "dummy";
        const targetDummy = targetNode?.type === "dummy";

        if (sourceDummy && targetDummy) {
            return 8;
        }

        if (sourceDummy || targetDummy) {
            return 4;
        }

        return 1;
    }

    getMinimumSeparation(a, b) {
        return (this.getNodeHeight(a) + this.getNodeHeight(b)) / 2 + this.vertexSep;
    }

    getNodeHeight(node) {
        if (!Number.isFinite(node?.height) || node.height < 0) {
            return 0;
        }

        return node.height;
    }

    getMinimumTop(topByNodeId) {
        const values = [...topByNodeId.values()].filter((value) => Number.isFinite(value));

        if (values.length === 0) {
            return 0;
        }

        return Math.min(...values);
    }

    groupByLayers(nodes) {
        const layers = [];

        for (const node of nodes) {
            const layer = Number.isFinite(node.layer) ? node.layer : 0;

            if (!layers[layer]) {
                layers[layer] = [];
            }

            layers[layer].push(node);
        }

        return layers.filter((layer) => Array.isArray(layer) && layer.length > 0);
    }

    sortLayer(layer) {
        return [...layer].sort((a, b) => {
            const orderA = Number.isFinite(a.order) ? a.order : 0;
            const orderB = Number.isFinite(b.order) ? b.order : 0;

            if (orderA !== orderB) {
                return orderA - orderB;
            }

            return String(a.id).localeCompare(String(b.id));
        });
    }
}

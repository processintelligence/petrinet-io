export default class VertexOrdering {
    constructor() {
        this.petriNet = null;
        this.layeredNodes = [];
        this.medianByNodeId = new Map();
    }

    /**
     * Currently using Median
     * later improvement adding transpose at end of each sweep
     */
    orderVertex(petriNet) {
        this.petriNet = petriNet;
        this.layeredNodes = [];
        this.medianByNodeId = new Map();


        for (const node of petriNet.nodes) {
            const layer = node.layer;

            if (! this.layeredNodes[layer]) {
                this.layeredNodes[layer] = [];
            }

            this.layeredNodes[layer].push(node);
        }

        let bestCrossings = this.countTotalCrossings();
        let improved = true;
        let iteration = 0;
        const maxIterations = 8;

        while (improved && iteration < maxIterations) {
            const beforeLayers = this.copyLayers();


            this.downwardSweep();

            this.upwardSweep();


            const currentCrossings = this.countTotalCrossings();

            if (currentCrossings < bestCrossings) {
                bestCrossings = currentCrossings;
                iteration++;
            } else {
                this.layeredNodes = beforeLayers;
                improved = false;
            }
        }

        const orderByNodeId = new Map();

        this.layeredNodes.forEach((layer) => {
            layer.forEach((node, index) => {
                orderByNodeId.set(node.id, index);
            });
        });

        this.petriNet.nodes = this.petriNet.nodes.map((node) => ({
            ...node,
            order: orderByNodeId.get(node.id)
        }));


        return this.petriNet
    }

    downwardSweep(){
        for (let layerIndex = 1; layerIndex < this.layeredNodes.length; layerIndex++) {
            const prevLayer = this.layeredNodes[layerIndex - 1];
            const currentLayer = this.layeredNodes[layerIndex];

            const prevLayerPositions = new Map();

            prevLayer.forEach((node, index) => {
                prevLayerPositions.set(node.id, index);
            });

            for (const node of currentLayer) {
                const parentIds = this.petriNet.edges
                    .filter((edge) => edge.target === node.id)
                    .map((edge) => edge.source);

                const parentPositions = parentIds
                    .filter((parentId) => prevLayerPositions.has(parentId))
                    .map((parentId) => prevLayerPositions.get(parentId));

                const meadianPositions = this.getMedian(parentPositions);
                this.medianByNodeId.set(node.id, meadianPositions);
            }

            currentLayer.sort((a, b) => {
                return this.medianByNodeId.get(a.id) - this.medianByNodeId.get(b.id);
            });


        }
    }

    upwardSweep() {
        for (let layerIndex = this.layeredNodes.length - 2; layerIndex >= 0; layerIndex--) {
            const currentLayer = this.layeredNodes[layerIndex];
            const nextLayer = this.layeredNodes[layerIndex + 1];

            const nextLayerPositions = new Map();

            nextLayer.forEach((node, index) => {
                nextLayerPositions.set(node.id, index);
            });

            for (const node of currentLayer) {
                const childIds = this.petriNet.edges
                    .filter((edge) => edge.source === node.id)
                    .map((edge) => edge.target);

                const childPositions = childIds
                    .filter((childId) => nextLayerPositions.has(childId))
                    .map((childId) => nextLayerPositions.get(childId));

                const medianPositions = this.getMedian(childPositions);
                this.medianByNodeId.set(node.id, medianPositions);
            }

            currentLayer.sort((a, b) => {
                return this.medianByNodeId.get(a.id) - this.medianByNodeId.get(b.id);
            });
        }
    }




    getMedian(values){
        if (values.length === 0) {
            return Infinity;
        }

        const sorted = [...values].sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);

        if (sorted.length % 2 === 0) {
            return (sorted[middle - 1] + sorted[middle]) / 2;
        }

        return sorted[middle];
    }

    copyLayers() {
        return this.layeredNodes.map((layer) => [...layer]);
    }

    countTotalCrossings() {
        let total = 0;

        for (let layerIndex = 0; layerIndex < this.layeredNodes.length - 1; layerIndex++) {
            const leftLayer = this.layeredNodes[layerIndex];
            const rightLayer = this.layeredNodes[layerIndex + 1];

            total += this.countCrossingsBetweenLayers(leftLayer, rightLayer);
        }

        return total;
    }

    countCrossingsBetweenLayers(leftLayer, rightLayer) {
        const leftPositions = new Map();
        const rightPositions = new Map();

        leftLayer.forEach((node, index) => {
            leftPositions.set(node.id, index);
        });

        rightLayer.forEach((node, index) => {
            rightPositions.set(node.id, index);
        });

        const layerEdges = this.petriNet.edges.filter((edge) =>
            leftPositions.has(edge.source) && rightPositions.has(edge.target)
        );

        let crossings = 0;

        for (let i = 0; i < layerEdges.length; i++) {
            for (let j = i + 1; j < layerEdges.length; j++) {
                const edgeA = layerEdges[i];
                const edgeB = layerEdges[j];

                const sourceA = leftPositions.get(edgeA.source);
                const sourceB = leftPositions.get(edgeB.source);
                const targetA = rightPositions.get(edgeA.target);
                const targetB = rightPositions.get(edgeB.target);

                const crosses =
                    (sourceA < sourceB && targetA > targetB) ||
                    (sourceA > sourceB && targetA < targetB);

                if (crosses) {
                    crossings++;
                }
            }
        }

        return crossings;
    }


}


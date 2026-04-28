export default class CoordinateAssignment {

    constructor() {
    }

    assignCoordinates(petriNet) {
        const startX = 100;
        const startY = 100;
        const layerSpacing = 100;
        const nodeSpacing = 100;

        const layers = petriNet.layers ?? this.groupByLayers(petriNet.nodes);
        const maxLayerSize = this.getMaxLayerSize(layers);

        petriNet.nodes = petriNet.nodes.map((node) => {
            const layer = Number.isFinite(node.layer) ? node.layer : 0;
            const order = Number.isFinite(node.order) ? node.order : 0;
            const layerSize = layers[layer]?.length ?? 1;
            const layerOffsetY = ((maxLayerSize - layerSize) * nodeSpacing) / 2;

            return {
                ...node,
                x: startX + layer * layerSpacing,
                y: startY + layerOffsetY + order * nodeSpacing
            };
        });

        petriNet.layers = layers;

        return petriNet;
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

        return layers;
    }

    getMaxLayerSize(layers) {
        const layerSizes = layers
            .filter((layer) => Array.isArray(layer))
            .map((layer) => layer.length);

        return layerSizes.length ? Math.max(...layerSizes) : 1;
    }
}

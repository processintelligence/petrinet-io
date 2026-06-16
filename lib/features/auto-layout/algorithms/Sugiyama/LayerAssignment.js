export default class LayerAssignment {

    /**
     * Longest path algorithm simple and good results
     * better results could be with use of LP formulation
     */
    constructor() {
        this.assignedNodes = new Map()
        this.petriNet = null;
    }

    assignLayers(petriNet) {
        this.petriNet = petriNet;
        this.assignedNodes.clear();

        const hasExplicitLayering =
            this.petriNet.nodes.length > 0 &&
            this.petriNet.nodes.every((node) => Number.isFinite(node.layer));

        if (hasExplicitLayering) {
            return petriNet;
        }

        const targetIds = this.petriNet.edges.map((edge) => edge.target);
        const startNodes = this.petriNet.nodes.filter((node) => !targetIds.includes(node.id));

        for (const node of startNodes) {
            this.assignedNodes.set(node.id, 0);
        }

        while (this.assignedNodes.size < this.petriNet.nodes.length) {
            const assignedParentEdges = this.petriNet.edges.filter((edge) =>
                this.assignedNodes.has(edge.source)
            );

            for (const assignedEdge of assignedParentEdges) {
                if (this.assignedNodes.has(assignedEdge.target)) {
                    continue;
                }
                const parentIds = this.petriNet.edges
                    .filter((edge) => edge.target === assignedEdge.target)
                    .map((edge) => edge.source);

                const allParentsAssigned = parentIds.every((parentId) =>
                    this.assignedNodes.has(parentId)
                );

                if (allParentsAssigned) {
                    const parentLayers = parentIds.map((parentId) =>
                        this.assignedNodes.get(parentId)
                    );
                    const layer = Math.max(...parentLayers) + 1;
                    this.assignedNodes.set(assignedEdge.target, layer);
                }

            }
        }

        this.petriNet.nodes = this.petriNet.nodes.map(node => ({...node, layer: this.assignedNodes.get(node.id)}));
        return petriNet;
    }
}

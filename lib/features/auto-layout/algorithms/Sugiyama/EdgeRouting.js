export default class EdgeRouting {

    constructor() {
        this.offset = 5;
        this.horizontalThreshold = 16;
    }

    route(petriNet) {
        const nodeById = new Map(petriNet.nodes.map((node) => [node.id, node]));

        petriNet.edges = petriNet.edges.map((edge) => {
            const sourceNode = nodeById.get(edge.source);
            const targetNode = nodeById.get(edge.target);

            if (!sourceNode || !targetNode) {
                return edge;
            }

            const reverseEdge = petriNet.edges.find((candidate) => (
                candidate.id !== edge.id &&
                candidate.source === edge.target &&
                candidate.target === edge.source
            ));

            if (reverseEdge && this.isHorizontalPair(sourceNode, targetNode)) {
                const offset = String(edge.id).localeCompare(String(reverseEdge.id)) < 0
                    ? -this.offset
                    : this.offset;

                return {
                    ...edge,
                    waypoints: this.buildReciprocalWaypoints(sourceNode, targetNode, offset)
                };
            }

            return {
                ...edge,
                waypoints: this.buildDirectWaypoints(sourceNode, targetNode)
            };
        });

        return petriNet;
    }

    isHorizontalPair(sourceNode, targetNode) {
        const sourceCenter = this.getNodeCenter(sourceNode);
        const targetCenter = this.getNodeCenter(targetNode);

        return Math.abs(sourceCenter.y - targetCenter.y) <= this.horizontalThreshold;
    }

    buildReciprocalWaypoints(sourceNode, targetNode, offset) {
        const sourceCenter = this.getNodeCenter(sourceNode);
        const targetCenter = this.getNodeCenter(targetNode);
        const sourceHalfWidth = (Number.isFinite(sourceNode.width) ? sourceNode.width : 0) / 2;
        const targetHalfWidth = (Number.isFinite(targetNode.width) ? targetNode.width : 0) / 2;
        const leftToRight = targetCenter.x >= sourceCenter.x;
        const laneY = ((sourceCenter.y + targetCenter.y) / 2) + offset;

        return [
            {
                x: sourceCenter.x + (leftToRight ? sourceHalfWidth : -sourceHalfWidth),
                y: laneY
            },
            {
                x: targetCenter.x + (leftToRight ? -targetHalfWidth : targetHalfWidth),
                y: laneY
            },
        ];
    }

    buildDirectWaypoints(sourceNode, targetNode) {
        return [
            this.getNodeCenter(sourceNode),
            this.getNodeCenter(targetNode)
        ];
    }

    getNodeCenter(node) {
        return {
            x: node.x + ((Number.isFinite(node.width) ? node.width : 0) / 2),
            y: node.y + ((Number.isFinite(node.height) ? node.height : 0) / 2)
        };
    }
}

export default class EdgeRouting {

    constructor() {
        this.offset = 5;
    }

    route(petriNet) {
        const nodeById = new Map(petriNet.nodes.map((node) => [node.id, node]));
        const edgeByDirection = new Map();
        const routedEdges = [];

        for (const edge of petriNet.edges) {
            edgeByDirection.set(`${edge.source}::${edge.target}`, edge);
        }

        for (const edge of petriNet.edges) {
            const sourceNode = nodeById.get(edge.source);
            const targetNode = nodeById.get(edge.target);

            if (!sourceNode || !targetNode) {
                routedEdges.push(edge);
                continue;
            }

            const reverseEdge = edgeByDirection.get(`${edge.target}::${edge.source}`);

            if (reverseEdge && reverseEdge.id !== edge.id) {
                routedEdges.push({
                    ...edge,
                    waypoints: this.buildReciprocalWaypoints(sourceNode, targetNode, edge, reverseEdge)
                });
                continue;
            }

            routedEdges.push({
                ...edge,
                waypoints: this.buildDirectWaypoints(sourceNode, targetNode)
            });
        }

        petriNet.edges = routedEdges;

        return petriNet;
    }

    buildReciprocalWaypoints(sourceNode, targetNode, edge, reverseEdge) {
        const sourceCenter = this.getNodeCenter(sourceNode);
        const targetCenter = this.getNodeCenter(targetNode);
        const normal = this.getPairNormal(sourceNode, targetNode);

        if (!normal) {
            return this.buildDirectWaypoints(sourceNode, targetNode);
        }

        const directionSign = String(edge.id).localeCompare(String(reverseEdge.id)) < 0 ? -1 : 1;
        const laneOffset = {
            x: normal.x * this.offset * directionSign,
            y: normal.y * this.offset * directionSign
        };

        return [
            {
                x: sourceCenter.x + laneOffset.x,
                y: sourceCenter.y + laneOffset.y
            },
            {
                x: targetCenter.x + laneOffset.x,
                y: targetCenter.y + laneOffset.y
            }
        ];
    }

    getPairNormal(sourceNode, targetNode) {
        const [firstNode, secondNode] = String(sourceNode.id).localeCompare(String(targetNode.id)) <= 0
            ? [sourceNode, targetNode]
            : [targetNode, sourceNode];
        const firstCenter = this.getNodeCenter(firstNode);
        const secondCenter = this.getNodeCenter(secondNode);
        const dx = secondCenter.x - firstCenter.x;
        const dy = secondCenter.y - firstCenter.y;
        const length = Math.hypot(dx, dy);

        if (length === 0) {
            return null;
        }

        return {
            x: -dy / length,
            y: dx / length
        };
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

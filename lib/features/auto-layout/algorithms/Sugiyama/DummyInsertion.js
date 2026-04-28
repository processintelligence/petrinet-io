export default class DummyInsertion {
    insert(petriNet) {
        const originalEdges = [...petriNet.edges];
        const newNodes = [...petriNet.nodes];
        const newEdges = [];

        for (const edge of originalEdges) {
            const source = petriNet.nodes.find((node) => node.id === edge.source);
            const target = petriNet.nodes.find((node) => node.id === edge.target);

            const diff = target.layer - source.layer;

            if (diff <= 1) {
                newEdges.push(edge);
                continue;
            }

            const originalSource = edge.source;
            const originalTarget = edge.target;

            let previousId = originalSource;

            for (let i = 1; i < diff; i++) {
                const dummyId = `dummy_${edge.id}_${i}`;

                newNodes.push({
                    id: dummyId,
                    type: "dummy",
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0,
                    layer: source.layer + i,
                    originalEdgeId: edge.id
                });

                newEdges.push({
                    id: `${edge.id}_part_${i}`,
                    source: previousId,
                    target: dummyId,
                    originalEdgeId: edge.id
                });

                previousId = dummyId;
            }

            newEdges.push({
                id: `${edge.id}_part_end`,
                source: previousId,
                target: originalTarget,
                originalEdgeId: edge.id
            });
        }

        petriNet.nodes = newNodes;
        petriNet.edges = newEdges;

        return petriNet;
    }
}

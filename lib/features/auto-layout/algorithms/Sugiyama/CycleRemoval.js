export default class CycleRemoval {

    /**
     * Currently using DFS (depth first search)
     */
    constructor() {
        this.marked = new Set();
        this.onStack = new Set();

        this.reversedIds = new Set();
        this.reversedEdges = [];

        this.outgoing = new Map();
    }

    removeCycles(petriNet){
        this.marked.clear();
        this.onStack.clear();
        this.reversedIds.clear();
        this.reversedEdges = [];
        this.outgoing.clear();

        const nodeIds = petriNet.nodes.map((node) => node.id);

        for (const nodeId of nodeIds) {
            this.outgoing.set(nodeId, []);
        }


        for (const edge of petriNet.edges) {
            this.outgoing.get(edge.source).push(edge);
        }

        for (const nodeId of nodeIds) {
            if (!this.marked.has(nodeId)) {
                this.dfs(nodeId);
            }
        }

        this.reversedEdges = petriNet.edges.filter((edge) => this.reversedIds.has(edge.id))
        const remainingEdges = petriNet.edges.filter((edge) => !this.reversedIds.has(edge.id));
        return{
            ...petriNet,
            edges: remainingEdges,
        };
    }


    dfs(nodeId){
        this.marked.add(nodeId);
        this.onStack.add(nodeId);

        for (const edge of this.outgoing.get(nodeId)) {
            const targetId = edge.target;


            if (this.reversedIds.has(edge.id)) {
                continue;
            }


            if (this.onStack.has(targetId)) {
                this.reversedIds.add(edge.id);
            } else if (!this.marked.has(targetId)) {
                this.dfs(targetId);
            }
        }

        this.onStack.delete(nodeId);
    }
}
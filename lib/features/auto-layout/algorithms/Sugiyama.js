export default class Sugiyama {

    static $inject = ["cycleRemoval", "layerAssignment",
        "dummyInsertion", "vertexOrdering","coordinateAssigment"];

    constructor (cycleRemoval, layerAssignment,
                 dummyInsertion, vertexOrdering, coordinateAssigment) {
        this.cycleRemoval = cycleRemoval;
        this.layerAssignment = layerAssignment;
        this.dummyInsertion = dummyInsertion;
        this.vertexOrdering = vertexOrdering;
        this.coordinateAssigment = coordinateAssigment;
    }

    layout (petriNet) {
        const acyclicPN = this.cycleRemoval.removeCycles(petriNet);
        const layeredPN = this.layerAssignment.assignLayers(acyclicPN);
        const layeredDummyPN = this.dummyInsertion.insert(layeredPN);
        const vertexOrderedPN = this.vertexOrdering.orderVertex(layeredDummyPN);
        const coordinateAssigmentPN = this.coordinateAssigment.assignCoordinates(vertexOrderedPN)

        return coordinateAssigmentPN;
    }





}
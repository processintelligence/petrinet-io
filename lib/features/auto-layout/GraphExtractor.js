export default class GraphExtractor {

  static $inject = ["elementRegistry"];

  constructor(elementRegistry) {
    this.elementRegistry = elementRegistry;
  }

  extract() {

    const elements = this.elementRegistry.getAll()

    const places = elements
        .filter(element => element.type === "petri:place")
        .map(place => ({
          id: place.id,
          type: "place",
          x: place.x,
          y: place.y,
          width: place.width,
          height: place.height,
          layer: Number.isFinite(place.businessObject?.layoutLayer)
            ? place.businessObject.layoutLayer
            : undefined,
        }));

    const transitions = elements
        .filter(element => element.type === "petri:transition")
        .map(transition => ({
          id: transition.id,
          type: "transition",
          x: transition.x,
          y: transition.y,
          width: transition.width,
          height: transition.height,
          layer: Number.isFinite(transition.businessObject?.layoutLayer)
            ? transition.businessObject.layoutLayer
            : undefined,
        }))

    const nodes = [ ...places, ...transitions ];

    const edges = elements
        .filter(element => element.type === "petri:connection")
        .map(connection => ({
          id: connection.id,
          type: "connection",
          source: connection.source.id,
          target: connection.target.id,
        }))




    return {nodes, edges};
  }
}

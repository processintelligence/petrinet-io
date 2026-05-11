export default class LayoutApplier {

  static $inject = ["elementRegistry", "eventBus"];

  constructor(elementRegistry, eventBus) {
    this.elementRegistry = elementRegistry;
    this.eventBus = eventBus;
  }

  apply(petriNet) {
    const changedElements = [];

    for(const node of petriNet.nodes){
      const element = this.elementRegistry.get(node.id);

      if (!element || !Number.isFinite(node.x) || !Number.isFinite(node.y)) {
        continue;
      }

      const delta = {
        x: node.x - element.x,
        y: node.y - element.y
      };

      if (!Number.isFinite(delta.x) || !Number.isFinite(delta.y)) {
        continue;
      }

      element.x = node.x;
      element.y = node.y;
      changedElements.push(element);
    }

    for (const edge of petriNet.edges) {
      const connection = this.elementRegistry.get(edge.id);

      if (!connection || !Array.isArray(edge.waypoints) || edge.waypoints.length < 2) {
        continue;
      }

      connection.waypoints = edge.waypoints.map((waypoint) => ({
        x: waypoint.x,
        y: waypoint.y
      }));
      changedElements.push(connection);
    }

    if (changedElements.length > 0) {
      this.eventBus.fire("elements.changed", { elements: changedElements });
    }
  }
}

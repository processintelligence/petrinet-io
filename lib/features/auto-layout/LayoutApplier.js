export default class LayoutApplier {

  static $inject = ["elementRegistry","modeling"];

  constructor(elementRegistry, modeling) {
    this.elementRegistry = elementRegistry;
    this.modeling = modeling;
  }

  apply(petriNet) {

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

      this.modeling.moveShape(element, delta);
    }
  }
}

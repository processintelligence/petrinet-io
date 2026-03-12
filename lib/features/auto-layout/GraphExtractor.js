export default class GraphExtractor {

  static $inject = ["elementRegistry"];

  constructor(elementRegistry) {
    this.elementRegistry = elementRegistry;
  }

  extract() {
    // TODO: Convert editor elements into a layout graph model.
  }
}

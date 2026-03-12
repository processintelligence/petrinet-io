export default class LayoutApplier {

  static $inject = ["modeling", "canvas"];

  constructor(modeling, canvas) {
    this.modeling = modeling;
    this.canvas = canvas;
  }

  apply(_positionsById = {}) {
    // TODO: Apply computed positions to diagram shapes and re-route connections.
  }
}

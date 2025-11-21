import Editor from './core/editor.js';

export default class PetriNetIO {
  /**
   * @param {Object} options
   * @param {string|HTMLElement} options.container - CSS selector or DOM node
   * @param {Object} [options.editorOptions] - forwarded to Editor
   */
  constructor(options = {}) {
    const { container, editorOptions = {}, ...rest } = options;

    if (!container) {
      throw new Error('PetriNetIO: `container` option is required');
    }

    this._container = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    if (!this._container) {
      throw new Error(`PetriNetIO: cannot find container "${container}"`);
    }

    // Editor should be your existing main class
    // Adjust the constructor signature if needed.
    this._editor = new Editor({
      container: this._container,
      ...editorOptions,
      ...rest
    });
  }

  /**
   * Low-level access if you need DI services, canvas, etc.
   */
  get editor() {
    return this._editor;
  }

  /**
   * Access the diagram-js canvas service.
   */
  getCanvas() {
    return this._editor.get('canvas');
  }

  /**
   * Access the simulation service (name from README).
   */
  getSimulationService() {
    return this._editor.get('simulationService');
  }

  /**
   * Import a PNML string into the editor.
   *
   * Returns a promise if your importer is async; otherwise just the result.
   */
  importPNML(pnmlString) {
    const importer = this._editor.get('pnmlImporter'); // adjust if different
    return importer.importPnml(pnmlString);
  }

  loadFromFile() {
    const importer = this._editor.get('pnmlImporter');
    importer.loadFromFile();
  }

  /**
   * Export the current net as PNML string.
   */
  exportPNML(targetFileName = 'model.pnml') {
    const exporter = this._editor.get('pnmlExporter');
    return exporter.exportPnml(targetFileName);
  }

  /**
   * Export SVG (you likely already have this in some helper).
   */
  async exportSVG(targetFileName = 'model.svg') {
    const svgExporter = this._editor.get('svgExporter');
    svgExporter.exportSvg(targetFileName)
  }

  /**
   * Clean up.
   */
  destroy() {
    if (this._editor && typeof this._editor.destroy === 'function') {
      this._editor.destroy();
    }

    this._editor = null;
    this._container = null;
  }
}

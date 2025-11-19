// src/PetriNetIO.js
import Editor from './editor.js';

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

  /**
   * Export the current net as PNML string.
   */
  exportPNML() {
    const exporter = this._editor.get('pnmlExporter'); // adjust if different
    return exporter.export();
  }

  /**
   * Export SVG (you likely already have this in some helper).
   */
  async exportSVG() {
    const canvas = this._editor.get('canvas');

    // If you already have an SVG export utility, call it here instead.
    // This is diagram-js style pseudo-code:
    if (canvas.saveSVG) {
      return canvas.saveSVG();
    }

    throw new Error('exportSVG is not implemented – wire this to your SVG exporter');
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

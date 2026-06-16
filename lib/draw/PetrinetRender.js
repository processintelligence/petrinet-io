/**
 * Main renderer for Petri net elements
 * Coordinates the rendering of shapes, connections, labels, and tokens
 */
import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer.js';
import { createLine } from 'diagram-js/lib/util/RenderUtil.js';
import { append as svgAppend } from 'tiny-svg';
import LabelRenderer from './renderers/LabelRenderer.js';
import TokenRenderer from './renderers/TokenRenderer.js';
import { drawPlace, getPlacePath } from './shapes/PlaceRenderer.js';
import { drawTransition, getTransitionPath } from './shapes/TransitionRenderer.js';
import { drawEmptyTransition } from './shapes/EmptyTransitionRenderer.js';
import { createArrowMarker } from './helpers/ConnectionRenderer.js';

const HIGH_PRIORITY = 1500;

export default class PetrinetRenderer extends BaseRenderer {
  static $inject = ["eventBus", "styles", "connectionDocking", "simulationService", "idCounterService"];

  constructor(eventBus, styles, connectionDocking, simulationService, idCounterService) {
    super(eventBus, HIGH_PRIORITY);

    // Store injected services
    this.styles = styles;
    this.connectionDocking = connectionDocking;
    this.simulationService = simulationService;
    this.idCounterService = idCounterService;

    // Initialize specialized renderers
    this.labelRenderer = new LabelRenderer(styles, idCounterService);
    this.tokenRenderer = new TokenRenderer(styles);
  }

  // Check if this renderer can handle the given element type
  canRender(element) {
    return element.type === "petri:place" ||
      element.type === "petri:transition" ||
      element.type === "petri:empty_transition" ||
      element.type === "petri:connection";
  }

  // Draw a shape (place or transition) on the canvas
  drawShape(parentGfx, element) {
    const { type } = element;
    let shape;

    // Draw the appropriate shape based on type
    if (type === "petri:place") {
      shape = drawPlace(parentGfx, element, this.styles);
    } else if (type === "petri:transition") {
      shape = drawTransition(parentGfx, element, this.styles, this.simulationService);
    } else if (type === "petri:empty_transition") {
      shape = drawEmptyTransition(parentGfx, element, this.styles, this.simulationService);
    }

    // Render label for all shapes
    this.labelRenderer.render(parentGfx, element);

    // Render tokens only for places
    if (type === "petri:place") {
      this.tokenRenderer.render(parentGfx, element);
    }

    return shape;
  }

  // Draw a connection (arc) between shapes
  drawConnection(parentGfx, element, attrs = {}) {
    const stroke = attrs.stroke || "black";
    const markerId =  "my-arrow";

    // Set connection style with arrow marker
    const connectionAttrs = this.styles.computeStyle({}, {
      stroke,
      strokeWidth: 2,
      fill:'transparent',
      markerEnd: createArrowMarker(parentGfx, markerId, stroke),
      ...attrs
    });

    // Crop rendered waypoints to shape boundaries without mutating the connection model.
    const waypoints = this.connectionDocking && (element.source || element.target)
      ? this.connectionDocking.getCroppedWaypoints(element)
      : element.waypoints;

    // Create and append the line
    const line = createLine(waypoints, connectionAttrs, 5);
    svgAppend(parentGfx, line);

    // Render connection label
    this.labelRenderer.render(parentGfx, element);

    return line;
  }

  // Get the SVG path for hit detection and selection
  getShapePath(shape) {
    const { type } = shape;

    if (type === "petri:place") {
      return getPlacePath(shape);
    }

    if (type === "petri:transition" || type === "petri:empty_transition") {
      return getTransitionPath(shape);
    }

    return getTransitionPath(shape);
  }
}

function isConnectionPreview(gfx) {
  let current = gfx;

  while (current) {
    if (current.classList && current.classList.contains('djs-dragger')) {
      return true;
    }

    if (current.tagName === 'svg' || current.nodeName === 'svg') {
      return false;
    }

    current = current.parentNode;
  }

  return false;
}

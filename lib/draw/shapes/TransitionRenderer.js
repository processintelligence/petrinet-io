/**
 * Handles drawing and path calculation for Petri net transitions (rectangles)
 */
import { create as svgCreate, attr as svgAttr, append as svgAppend } from 'tiny-svg';
import { componentsToPath } from 'diagram-js/lib/util/RenderUtil.js';
import { drawPlayTriangle } from '../helpers/PlayTriangleHelper.js';

// Draw a transition (rectangle) on the canvas
export function drawTransition(parentGfx, element, styles, simulationService) {
  const { width, height } = element;
  const isEnabled = simulationService.isTransitionEnabled(element);
  const isFired = simulationService.isTransitionFired(element);

  // Determine fill color based on simulation state
  let fillColor = "white";
  if (isEnabled) {
    fillColor = "lightgreen";
  } else if (isFired && !isEnabled) {
    fillColor = "plum";
  }

  // Set rectangle style
  const attrs = styles.computeStyle({}, {
    stroke: "#808080",
    strokeWidth: 2,
    fill: fillColor,
  });

  if (attrs.fill === "none") {
    delete attrs.fillOpacity;
  }

  // Create and append rectangle
  const rect = svgCreate("rect");
  svgAttr(rect, { x: 0, y: 0, width, height, rx: 0, ry: 0 });
  svgAttr(rect, attrs);
  svgAppend(parentGfx, rect);

  // Draw play triangle if transition is enabled
  if (isEnabled) {
    drawPlayTriangle(parentGfx, width, height, styles);
  }

  return rect;
}

// Get the SVG path for a transition (used for hit detection)
export function getTransitionPath(shape) {
  let x = shape.x;
  let y = shape.y;
  let width = shape.width;
  let height = shape.height;

  // Define rectangle path
  const rectPath = [
    ['M', x, y],
    ['l', width, 0],
    ['l', 0, height],
    ['l', -width, 0],
    ['z']
  ];

  return componentsToPath(rectPath);
}


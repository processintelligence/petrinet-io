/**
 * Handles drawing for Petri net empty transitions (filled rectangles)
 */
import { create as svgCreate, attr as svgAttr, append as svgAppend } from 'tiny-svg';
import { drawPlayTriangle } from '../helpers/PlayTriangleHelper.js';

// Draw an empty transition (filled rectangle) on the canvas
export function drawEmptyTransition(parentGfx, element, styles, simulationService) {
  const { width, height } = element;
  const isEnabled = simulationService.isTransitionEnabled(element);
  const isFired = simulationService.isTransitionFired(element);

  // Determine fill color based on simulation state
  let fillColor = "black";
  if (isEnabled) {
    fillColor = "lightgreen";
  } else if (isFired && !isEnabled) {
    fillColor = "plum";
  }

  // Set rectangle style with full opacity
  const attrs = styles.computeStyle({}, {
    stroke: "black",
    strokeWidth: 2,
    fill: fillColor,
    fillOpacity: 1
  });

  // Create and append filled rectangle
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


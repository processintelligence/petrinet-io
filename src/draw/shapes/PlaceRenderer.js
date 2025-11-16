/**
 * Handles drawing and path calculation for Petri net places (circles)
 */
import { create as svgCreate, attr as svgAttr, append as svgAppend } from 'tiny-svg';
import { componentsToPath } from 'diagram-js/lib/util/RenderUtil.js';

// Draw a place (circle) on the canvas
export function drawPlace(parentGfx, element, styles) {
  const { width, height } = element;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.round((width + height) / 4);

  // Set circle style
  const attrs = styles.computeStyle({}, {
    stroke: "black",
    strokeWidth: 2,
    fill: "white"
  });

  if (attrs.fill === "none") {
    delete attrs.fillOpacity;
  }

  // Create and append circle
  const circle = svgCreate("circle");
  svgAttr(circle, { cx, cy, r: radius });
  svgAttr(circle, attrs);
  svgAppend(parentGfx, circle);

  return circle;
}

// Get the SVG path for a place (used for hit detection)
export function getPlacePath(shape) {
  let cx = shape.x + shape.width / 2;
  let cy = shape.y + shape.height / 2;
  let radius = shape.width / 2;

  // Define circle path using SVG arc commands
  const circlePath = [
    ['M', cx, cy],
    ['m', 0, -radius],
    ['a', radius, radius, 0, 1, 1, 0, 2 * radius],
    ['a', radius, radius, 0, 1, 1, 0, -2 * radius],
    ['z']
  ];

  return componentsToPath(circlePath);
}


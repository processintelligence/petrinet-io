/**
 * Helper for drawing the play triangle indicator on enabled transitions
 */
import { create as svgCreate, attr as svgAttr, append as svgAppend } from 'tiny-svg';

// Draw a play triangle in the center of a transition
export function drawPlayTriangle(parentGfx, width, height, styles) {
  const cx = width / 2;
  const cy = height / 2;
  const size = Math.min(width, height) * 0.25;

  // Calculate triangle points
  const x1 = cx - size / 3;
  const y1 = cy - size / 2;
  const x2 = cx - size / 3;
  const y2 = cy + size / 2;
  const x3 = cx + size / 2;
  const y3 = cy;

  const path = svgCreate('path');

  // Set triangle style
  const attrs = styles.computeStyle({}, {
    fill: 'darkgreen',
    stroke: 'darkgreen',
    strokeWidth: 1
  });

  // Create triangle path
  svgAttr(path, {
    d: `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} Z`
  });

  svgAttr(path, attrs);
  svgAppend(parentGfx, path);

  return path;
}


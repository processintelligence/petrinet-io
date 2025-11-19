/**
 * Helper for creating arrow markers on connections
 */
import { create as svgCreate, append as svgAppend } from 'tiny-svg';

// Create an arrow marker for connection endpoints
export function createArrowMarker(parentGfx, id, stroke) {
  // Find the SVG root element
  let svgElement = parentGfx.ownerSVGElement;
  if (!svgElement) {
    let current = parentGfx;
    while (current && current.parentNode) {
      current = current.parentNode;
      if (current.tagName === 'svg' || current.nodeName === 'svg') {
        svgElement = current;
        break;
      }
    }
  }

  if (!svgElement) {
    return `url(#${id})`;
  }

  // Get or create defs element
  let defs = svgElement.querySelector("defs");
  if (!defs) {
    defs = svgCreate("defs");
    svgAppend(svgElement, defs);
  }
  
  // Create marker if it doesn't exist
  if (!defs.querySelector("#" + id)) {
    const marker = svgCreate("marker", {
      id,
      viewBox: "0 0 20 20",
      refX: 11,
      refY: 10,
      markerWidth: 10,
      markerHeight: 10,
      orient: "auto"
    });
    
    // Create arrow path
    const path = svgCreate("path", {
      d: "M 1 5 L 11 10 L 1 15 Z",
      fill: stroke,
      stroke
    });
    
    svgAppend(marker, path);
    svgAppend(defs, marker);
  }
  
  return `url(#${id})`;
}


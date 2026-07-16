/**
 * Handles rendering of labels for Petri net elements
 * Supports multi-line text, custom positioning, and ID labels
 */
import { create as svgCreate, attr as svgAttr, append as svgAppend } from 'tiny-svg';

export default class LabelRenderer {
  constructor(styles, idCounterService) {
    this.styles = styles;
    this.idCounterService = idCounterService;
  }

  // Main render method for element labels
  render(parentGfx, element) {
    const textValue = element.businessObject?.name ?? '';

    // Set text styling
    const attrs = this.styles.computeStyle({}, {
      fill: 'black',
      fontSize: 12,
      fontFamily: 'Arial, sans-serif'
    });

    // Calculate where the label should be positioned
    const position = this._calculateLabelPosition(element);

    // Render ID label if visible
    if (this._shouldRenderId(element)) {
      this._renderIdLabel(parentGfx, element, attrs);
    }

    // Render name label (except for empty transitions)
    if (element.type !== 'petri:empty_transition') {
      this._renderNameLabel(parentGfx, textValue, position, attrs);
    }
  }

  // Check if ID label should be rendered
  _shouldRenderId(element) {
    return this.idCounterService.labelsVisible && element.id &&
           (element.type === 'petri:place' ||
            element.type === 'petri:transition' ||
            element.type === 'petri:empty_transition');
  }

  // Render the element ID as a label
  _renderIdLabel(parentGfx, element, attrs) {
    const idPosition = this._calculateIdPosition(element);

    // Create text element for ID
    const idtext = svgCreate('text');
    svgAttr(idtext, attrs);
    svgAttr(idtext, {
      x: idPosition.x,
      y: idPosition.y,
      'text-anchor': idPosition.textAnchor,
      'dominant-baseline': idPosition.baseline,
      fontStyle: 'italic',
      fill: '#888',
    });

    idtext.textContent = String(element.id);
    svgAppend(parentGfx, idtext);
  }

  // Calculate position for ID label based on element type
  _calculateIdPosition(element) {
    if (element.type === 'petri:place') {
      // Position ID at bottom-left of circle
      const r = Math.min(element.width, element.height) / 2;
      const cx = element.width / 2;
      const cy = element.height / 2;
      const margin = 4;
      const offset = r / Math.SQRT2;

      return {
        x: cx - offset - margin,
        y: cy + offset + margin,
        textAnchor: 'end',
        baseline: 'hanging'
      };
    } else {
      // Position ID below transition
      const cx = element.width / 2;
      return {
        x: cx,
        y: element.height + 14,
        textAnchor: 'middle',
        baseline: 'hanging'
      };
    }
  }

  // Calculate position for name label based on element type
  _calculateLabelPosition(element) {
    const businessObject = element.businessObject || {};

    // Delegate to specific position calculator based on element type
    if (element.type === 'petri:connection') {
      return this._calculateConnectionLabelPosition(element, businessObject);
    } else if (element.type === 'petri:place') {
      return this._calculatePlaceLabelPosition(element, businessObject);
    } else if (element.type === 'petri:transition' || element.type === 'petri:empty_transition') {
      return this._calculateTransitionLabelPosition(element, businessObject);
    } else {
      return this._calculateDefaultLabelPosition(element, businessObject);
    }
  }

  // Calculate label position for connections (arcs)
  _calculateConnectionLabelPosition(element, businessObject) {
    const waypoints = element.waypoints;
    let refX, refY;

    // Find midpoint of connection
    if (waypoints.length === 2) {
      const start = waypoints[0];
      const end = waypoints[1];
      refX = (start.x + end.x) / 2;
      refY = (start.y + end.y) / 2;
    } else {
      const middleIndex = Math.floor(waypoints.length / 2);
      const middlePoint = waypoints[middleIndex];
      refX = middlePoint.x;
      refY = middlePoint.y;
    }

    // Apply custom offset if exists
    if (businessObject.labelOffset) {
      return {
        x: refX + businessObject.labelOffset.x,
        y: refY + businessObject.labelOffset.y,
        textAnchor: 'middle',
        baseline: 'middle'
      };
    }

    // Set default offset
    if (!element.businessObject) element.businessObject = {};
    element.businessObject.labelOffset = { x: 0, y: -10 };

    return {
      x: refX,
      y: refY - 10,
      textAnchor: 'middle',
      baseline: 'middle'
    };
  }

  // Calculate label position for places (circles)
  _calculatePlaceLabelPosition(element, businessObject) {
    const r = Math.min(element.width, element.height) / 2;
    const cx = element.width / 2;
    const cy = element.height / 2;
    const margin = 4;
    const offset = r / Math.SQRT2;

    // Apply custom offset if exists
    if (businessObject.labelOffset) {
      return {
        x: cx + businessObject.labelOffset.x,
        y: cy + businessObject.labelOffset.y,
        textAnchor: 'start',
        baseline: 'hanging'
      };
    }

    // Set default offset (top-right of circle)
    if (!element.businessObject) element.businessObject = {};
    element.businessObject.labelOffset = {
      x: offset + margin,
      y: offset + margin
    };

    return {
      x: cx + offset + margin,
      y: cy + offset + margin,
      textAnchor: 'start',
      baseline: 'hanging'
    };
  }

  // Calculate label position for transitions (rectangles)
  _calculateTransitionLabelPosition(element, businessObject) {
    const cx = element.width / 2;
    const cy = element.height / 2;

    // Apply custom offset if exists
    if (businessObject.labelOffset) {
      return {
        x: cx + businessObject.labelOffset.x,
        y: cy + businessObject.labelOffset.y,
        textAnchor: 'middle',
        baseline: 'middle'
      };
    }

    // Set default offset (center of rectangle)
    if (!element.businessObject) element.businessObject = {};
    element.businessObject.labelOffset = { x: 0, y: 0 };

    return {
      x: cx,
      y: cy,
      textAnchor: 'middle',
      baseline: 'middle'
    };
  }

  // Calculate default label position for unknown element types
  _calculateDefaultLabelPosition(element, businessObject) {
    const cx = element.width / 2;
    const cy = element.height / 2;

    // Apply custom offset if exists
    if (businessObject.labelOffset) {
      return {
        x: cx + businessObject.labelOffset.x,
        y: cy + businessObject.labelOffset.y,
        textAnchor: 'middle',
        baseline: 'middle'
      };
    }

    // Set default offset (center)
    if (!element.businessObject) element.businessObject = {};
    element.businessObject.labelOffset = { x: 0, y: 0 };

    return {
      x: cx,
      y: cy,
      textAnchor: 'middle',
      baseline: 'middle'
    };
  }

  // Render the name label (single or multi-line)
  _renderNameLabel(parentGfx, textValue, position, attrs) {
    const lines = String(textValue).split('\n');

    if (lines.length === 1) {
      // Render single line text
      const text = svgCreate('text');
      svgAttr(text, {
        x: position.x,
        y: position.y,
        'text-anchor': position.textAnchor,
        'dominant-baseline': position.baseline
      });
      svgAttr(text, attrs);
      text.textContent = lines[0];
      svgAppend(parentGfx, text);
    } else {
      // Render multi-line text
      this._renderMultiLineLabel(parentGfx, lines, position, attrs);
    }
  }

  // Render multi-line label using tspan elements
  _renderMultiLineLabel(parentGfx, lines, position, attrs) {
    const lineHeight = 14;
    let startY;

    // Calculate starting Y position based on baseline alignment
    if (position.baseline === 'middle') {
      startY = position.y - (lines.length - 1) * lineHeight / 2;
    } else if (position.baseline === 'hanging') {
      startY = position.y;
    } else {
      startY = position.y - (lines.length - 1) * lineHeight;
    }

    const text = svgCreate('text');

    // Create a tspan for each line
    lines.forEach((line, index) => {
      const tspan = svgCreate('tspan');
      svgAttr(tspan, {
        x: position.x,
        y: startY + index * lineHeight,
        'text-anchor': position.textAnchor
      });
      svgAttr(tspan, attrs);
      tspan.textContent = line;
      svgAppend(text, tspan);
    });

    svgAttr(text, {
      'text-anchor': position.textAnchor
    });

    svgAppend(parentGfx, text);
  }
}

import { create as svgCreate, attr as svgAttr, append as svgAppend } from 'tiny-svg';

import {componentsToPath} from 'diagram-js/lib/util/RenderUtil.js';
import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer.js';
import { createLine } from 'diagram-js/lib/util/RenderUtil.js';


const HIGH_PRIORITY = 1500;


export default class CustomRenderer extends BaseRenderer{

    static $inject = ["eventBus", "styles", "connectionDocking", "simulationService", "idCounterService"]
    

    constructor(eventBus, styles, connectionDocking, simulationService, idCounterService){
        super(eventBus, HIGH_PRIORITY );
        this.styles = styles
        this.connectionDocking = connectionDocking;
        this.simulationService = simulationService;
        this.idCounterService = idCounterService;
    }


    canRender(element){
        return element.type === "petri:place" ||
         element.type === "petri:transition" ||
          element.type === "petri:frame" ||
           element.type === "petri:empty_transition"||
           element.type === "petri:connection" 
    }

    drawShape(parentGfx, element){
        
        const {type} = element; 

      if(type === "petri:place"){
          const { width, height} = element;
          console.log("circle")
          const shape = draw_circle(parentGfx, width, height,this.styles, undefined);
          draw_label(parentGfx, element, this.styles, this.idCounterService);
          return shape;
      }

      if ( type=== "petri:transition"){
          const { width, height} = element;
          const r = 0;
          console.log("rect")
          const isEnabled = this.simulationService.isTransitionEnabled(element);
          const isFired = this.simulationService.isTransitionFired(element);
          const shape = draw_rect(parentGfx, width, height, r, this.styles, undefined, isEnabled, isFired);
          draw_label(parentGfx, element, this.styles, this.idCounterService);
          return shape;
      }

      if ( type=== "petri:frame"){
          const { width, height} = element;
          const r = 0;
          console.log("frame")
          const shape = draw_frame(parentGfx, width,height,r,this.styles, undefined);
          draw_label(parentGfx, element, this.styles, this.idCounterService);
          return shape;
      }

      if ( type=== "petri:empty_transition"){
          const { width, height} = element;
          const r = 0;
          console.log("empty_transition")
          const isEnabled = this.simulationService.isTransitionEnabled(element);
          const isFired = this.simulationService.isTransitionFired(element);
          const shape = draw_empty_transition(parentGfx, width, height, r, this.styles, undefined, isEnabled, isFired);
          draw_label(parentGfx, element, this.styles, this.idCounterService);
          return shape;
      }
    }

    drawConnection(parentGfx, element) {
        const attrs = this.styles.computeStyle({}, {
          stroke: "black",
          strokeWidth: 2,
          markerEnd: createArrowMarker(parentGfx, "my-arrow", "black")
        });

        // crop waypoints to shape boundaries if docking is available
        if (this.connectionDocking && (element.source || element.target)) {
            element.waypoints = this.connectionDocking.getCroppedWaypoints(element);
        }

        const line = createLine(element.waypoints, attrs, 5);
        svgAppend(parentGfx, line);
        draw_label(parentGfx, element, this.styles, this.idCounterService);
        console.log(`${element.type}`)
        return line;
      }
    
    getShapePath(shape){
        const {type} = shape;
        if(type === "petri:place"){
            return getCirclePath(shape);
        }

        if(type==="petri:transition"|| 
        type ==="petri:empty_transition"||
        type ==="petri:frame"){
            return getRectPath(shape)
        }

        return getRectPath(shape);
      }

}


//helper functions 

function draw_circle(parentGfx, width, height, styles, attrs){

    attrs= styles.computeStyle(attrs || {},{
        stroke: "black",
        strokeWidth: 2, 
        fill: "white"
    })

    if (attrs.fill === "none"){
        delete attrs.fillOpacity
    }

    const cx = width/2
    const cy = height/2

    const circle= svgCreate("circle");

    svgAttr(circle,{ 
        cx: cx, 
        cy: cy,
        r: Math.round((width+height)/4)
    })

    svgAttr(circle, attrs);

    svgAppend(parentGfx, circle);

    return circle;

}

function draw_rect(parentGfx, width, height, r, styles, attrs, isEnabled, isFired){

    // Determine fill color based on state
    let fillColor = "white"; // default
    if (isEnabled) {
        fillColor = "lightgreen"; // can fire now
    } else if (isFired && !isEnabled) {
        fillColor = "plum"; // has fired but can't fire now
    }

    attrs= styles.computeStyle(attrs || {},{
        stroke: "black",
        strokeWidth: 2, 
        fill: fillColor
    })


    if (attrs.fill === "none"){
        delete attrs.fillOpacity
    }

    const rect= svgCreate("rect");

    svgAttr(rect,{
        x: 0,
        y: 0, 
        width: width,
        height: height, 
        rx: r, 
        ry: r
    });

    svgAttr(rect,attrs);

    svgAppend(parentGfx, rect);

    // Add play triangle if enabled
    if (isEnabled) {
        draw_play_triangle(parentGfx, width, height, styles);
    }

    return rect 

}



function draw_empty_transition(parentGfx, width, height, r, styles, attrs, isEnabled, isFired){

    // Determine fill color based on state
    let fillColor = "black"; // default
    if (isEnabled) {
        fillColor = "lightgreen"; // can fire now
    } else if (isFired && !isEnabled) {
        fillColor = "plum"; // has fired but can't fire now
    }

    attrs= styles.computeStyle(attrs || {},{
        stroke: "black",
        strokeWidth: 2, 
        fill: fillColor,
        fillOpacity: 1
    })

    const rect= svgCreate("rect");

    svgAttr(rect,{
        x: 0,
        y: 0, 
        width: width,
        height: height, 
        rx: r, 
        ry: r
    });

    svgAttr(rect,attrs);

    svgAppend(parentGfx, rect);

    // Add play triangle if enabled
    if (isEnabled) {
        draw_play_triangle(parentGfx, width, height, styles);
    }

    return rect 

}


function draw_play_triangle(parentGfx, width, height, styles) {

    const cx = width / 2;
    const cy = height / 2;
    

    const size = Math.min(width, height) * 0.25;
    

    const x1 = cx - size / 3;
    const y1 = cy - size / 2;
    const x2 = cx - size / 3;
    const y2 = cy + size / 2;
    const x3 = cx + size / 2;
    const y3 = cy;
    

    const path = svgCreate('path');
    
    const attrs = styles.computeStyle({}, {
        fill: 'darkgreen',
        stroke: 'darkgreen',
        strokeWidth: 1
    });
    
    svgAttr(path, {
        d: `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} Z`
    });
    
    svgAttr(path, attrs);
    svgAppend(parentGfx, path);
    
    return path;
}


//Arrows related helpers

function createArrowMarker(parentGfx, id, stroke) {
    // Find the SVG element - try ownerSVGElement first, then traverse up
    let svgElement = parentGfx.ownerSVGElement;
    if (!svgElement) {
      // Traverse up the parent chain to find the SVG element
      let current = parentGfx;
      while (current && current.parentNode) {
        current = current.parentNode;
        if (current.tagName === 'svg' || current.nodeName === 'svg') {
          svgElement = current;
          break;
        }
      }
    }
    
    // If still no SVG element found, return a default marker reference
    if (!svgElement) {
      return `url(#${id})`;
    }
    
    // create the marker only once
    let defs = svgElement.querySelector("defs");
    if (!defs) {
      defs = svgCreate("defs");
      svgAppend(svgElement, defs);
    }
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


function getCirclePath(shape){

  let cx = shape.x + shape.width / 2;
  let cy = shape.y + shape.height / 2;
  let radius = shape.width / 2;

    const circlePath = [
    [ 'M', cx, cy ],
    [ 'm', 0, -radius ],
    [ 'a', radius, radius, 0, 1, 1, 0, 2 * radius ],
    [ 'a', radius, radius, 0, 1, 1, 0, -2 * radius ],
    [ 'z' ]
    ];

    return componentsToPath(circlePath);
}


function getRectPath(shape) {
    let x = shape.x;
    let y = shape.y;
    let width = shape.width;
    let height = shape.height;
  
    const rectPath = [
      [ 'M', x, y ],
      [ 'l', width, 0 ],
      [ 'l', 0, height ],
      [ 'l', -width, 0 ],
      [ 'z' ]
    ];
  
    return componentsToPath(rectPath);
  }

function draw_label(parentGfx, element, styles, idCounterService){


  const textValue = element.businessObject?.name??""

  const attrs = styles.computeStyle({}, {
    fill: 'black',
    fontSize: 12, 
    fontFamily: 'Arial, sans-serif'
  });

  const text = svgCreate('text');
  let x, y, textAnchor, baseline;
  
  if(element.type === "petri:connection"){
    const waypoints = element.waypoints;
    
    // Calculate the reference point (middle of the arc)
    let refX, refY;
    if (waypoints.length === 2) {
      // Simple case: straight line between two points
      const start = waypoints[0];
      const end = waypoints[1];
      refX = (start.x + end.x) / 2;
      refY = (start.y + end.y) / 2;
    } else {
      // Multiple waypoints: use the middle waypoint
      const middleIndex = Math.floor(waypoints.length / 2);
      const middlePoint = waypoints[middleIndex];
      refX = middlePoint.x;
      refY = middlePoint.y;
    }
    
    // Use stored offset if available (relative to arc middle), otherwise calculate
    if (element.businessObject?.labelOffset) {
      // Offset is relative to arc middle
      x = refX + element.businessObject.labelOffset.x;
      y = refY + element.businessObject.labelOffset.y;
    } else {
      // Default: slightly above the line
      x = refX;
      y = refY - 10;
      
      // Store offset RELATIVE TO ARC MIDDLE for PNML export
      if (!element.businessObject) element.businessObject = {};
      element.businessObject.labelOffset = { x: 0, y: -10 };
    }
    
    textAnchor = 'middle';
    baseline = 'middle';
  }
  else if (element.type === 'petri:place') {
    const r = Math.min(element.width, element.height) / 2;
    const cx = element.width / 2;
    const cy = element.height / 2;
    const margin = 4;
    const offset = r / Math.SQRT2; // ~45°

    // Render ID label for place (bottom-left corner)
    if (idCounterService.labelsVisible && element.id){
      const idtext = svgCreate('text');
      const idx = cx - offset - margin;
      const idy = cy + offset + margin;

      svgAttr(idtext, {
        x: idx,
        y: idy,
        'text-anchor': 'end',
        'dominant-baseline': 'hanging'
      });
    
      svgAttr(idtext, attrs);
      idtext.textContent = String(element.id);
      svgAppend(parentGfx, idtext);
    }

    // Name label positioning (top-right corner)
    textAnchor = 'start';
    baseline = 'hanging';
    
    // Use stored offset if available (relative to center), otherwise calculate default
    if (element.businessObject?.labelOffset) {
      // Offset is relative to center
      x = cx + element.businessObject.labelOffset.x;
      y = cy + element.businessObject.labelOffset.y;
    } else {
      // place label just outside the circle boundar
      x = cx + offset + margin;
      y = cy + offset + margin;
      
      // Store offset RELATIVE TO CENTER for PNML export
      if (!element.businessObject) element.businessObject = {};
      element.businessObject.labelOffset = { 
        x: offset + margin,  // relative to center
        y: offset + margin 
      };
    }
  
  } else if (element.type === 'petri:transition' || element.type === 'petri:empty_transition') {
    // For transitions: name centered, ID below
    const cx = element.width / 2;
    const cy = element.height / 2;
    
    // Render ID label below the transition
    if (idCounterService.labelsVisible && element.id) {
      const idtext = svgCreate('text');
      const idx = cx;
      const idy = element.height + 14; // Below the bottom edge

      svgAttr(idtext, {
        x: idx,
        y: idy,
        'text-anchor': 'middle',
        'dominant-baseline': 'hanging'
      });
    
      svgAttr(idtext, attrs);
      idtext.textContent = String(element.id);
      svgAppend(parentGfx, idtext);
    }
    
    // Name label positioning (centered)
    // Use stored offset if available (relative to center), otherwise calculate default
    if (element.businessObject?.labelOffset) {
      // Offset is relative to center
      x = cx + element.businessObject.labelOffset.x;
      y = cy + element.businessObject.labelOffset.y;
    } else {
      // Centered label
      x = cx;
      y = cy;
      
      // Store offset RELATIVE TO CENTER for PNML export (0,0 = centered)
      if (!element.businessObject) element.businessObject = {};
      element.businessObject.labelOffset = { x: 0, y: 0 };
    }
    
    textAnchor = 'middle';
    baseline = 'middle';
  } else {
    // default: centered (for frames, etc.)
    const cx = element.width / 2;
    const cy = element.height / 2;
    
    // Use stored offset if available (relative to center), otherwise calculate default
    if (element.businessObject?.labelOffset) {
      // Offset is relative to center
      x = cx + element.businessObject.labelOffset.x;
      y = cy + element.businessObject.labelOffset.y;
    } else {
      // Centered label
      x = cx;
      y = cy;
      
      // Store offset RELATIVE TO CENTER for PNML export (0,0 = centered)
      if (!element.businessObject) element.businessObject = {};
      element.businessObject.labelOffset = { x: 0, y: 0 };
    }
    
    textAnchor = 'middle';
    baseline = 'middle';
  }

  // Render the name label for all elements except empty transitions
  if (element.type !== 'petri:empty_transition') {
    // Split text by newlines to support multi-line text
    const lines = String(textValue).split('\n');
    
    if (lines.length === 1) {
      // Single line - use simple text element
      svgAttr(text, {
        x,
        y,
        'text-anchor': textAnchor,
        'dominant-baseline': baseline
      });
      svgAttr(text, attrs);
      text.textContent = lines[0];
      svgAppend(parentGfx, text);
    } else {
      // Multi-line - use tspan elements for each line
      const lineHeight = 14; // Line spacing
      let startY;
      
      // Calculate starting Y position based on baseline
      if (baseline === 'middle') {
        startY = y - (lines.length - 1) * lineHeight / 2;
      } else if (baseline === 'hanging') {
        startY = y;
      } else {
        startY = y - (lines.length - 1) * lineHeight;
      }
      
      lines.forEach((line, index) => {
        const tspan = svgCreate('tspan');
        svgAttr(tspan, {
          x: x,
          y: startY + index * lineHeight,
          'text-anchor': textAnchor
        });
        svgAttr(tspan, attrs);
        tspan.textContent = line;
        svgAppend(text, tspan);
      });
      
      svgAttr(text, {
        'text-anchor': textAnchor
      });
      svgAppend(parentGfx, text);
    }
  }

  // Render tokens for places if defined on businessObject
  if (element.type === 'petri:place') {
    const tokens = Number.isFinite(element.businessObject?.tokens) ? element.businessObject.tokens : 0;
    if (tokens > 0) {
      draw_tokens(parentGfx, element, tokens, styles);
    } 
  }
}

function draw_tokens(parentGfx, element, tokens, styles) {
  const cx = element.width / 2;
  const cy = element.height / 2;
  const r = Math.min(element.width, element.height) / 2;
  const dotR = Math.max(2, Math.min(6, r / 6));
  const fillAttrs = styles.computeStyle({}, { fill: 'black' });

  const placeDot = (dx, dy, label) => {
    if (label != null) {
      const text = svgCreate('text');
      svgAttr(text, { x: cx, y: cy, 'text-anchor': 'middle', 'dominant-baseline': 'middle' });
      svgAttr(text, styles.computeStyle({}, { fill: 'black', fontSize: 12 }));
      text.textContent = String(label);
      svgAppend(parentGfx, text);
      return;
    }
    const dot = svgCreate('circle');
    svgAttr(dot, { cx: cx + dx, cy: cy + dy, r: dotR });
    svgAttr(dot, fillAttrs);
    svgAppend(parentGfx, dot);
  };

  if (tokens === 1) {
    placeDot(0, 0);
  } else if (tokens === 2) {
    placeDot(-dotR * 2, 0);
    placeDot(dotR * 2, 0);
  } else if (tokens === 3) {
    placeDot(0, -dotR * 2);
    placeDot(-dotR * 2, dotR * 2);
    placeDot(dotR * 2, dotR * 2);
  } else if (tokens === 4) {
    placeDot(-dotR * 2, -dotR * 2);
    placeDot(dotR * 2, -dotR * 2);
    placeDot(-dotR * 2, dotR * 2);
    placeDot(dotR * 2, dotR * 2);
  } else if (tokens > 4) {
    placeDot(0, 0, tokens);
  }

}
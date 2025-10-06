import { create as svgCreate, attr as svgAttr, append as svgAppend } from 'tiny-svg';

import {componentsToPath} from 'diagram-js/lib/util/RenderUtil.js';
import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer.js';
import { createLine } from 'diagram-js/lib/util/RenderUtil.js';


const HIGH_PRIORITY = 1500;


export default class CustomRenderer extends BaseRenderer{

    static $inject = ["eventBus", "styles", "connectionDocking", "simulationService"]
    

    constructor(eventBus, styles, connectionDocking, simulationService){
        super(eventBus, HIGH_PRIORITY );
        this.styles = styles
        this.connectionDocking = connectionDocking;
        this.simulationService = simulationService;
    }


    canRender(element){
        console.log("canRender")
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
          draw_label(parentGfx, element, this.styles);
          return shape;
      }

      if ( type=== "petri:transition"){
          const { width, height} = element;
          const r = 10;
          console.log("rect")
          const isEnabled = this.simulationService.isTransitionEnabled(element);
          const shape = draw_rect(parentGfx, width, height, r, this.styles, undefined, isEnabled);
          draw_label(parentGfx, element, this.styles);
          return shape;
      }

      if ( type=== "petri:frame"){
          const { width, height} = element;
          const r = 10;
          console.log("frame")
          const shape = draw_frame(parentGfx, width,height,r,this.styles, undefined);
          draw_label(parentGfx, element, this.styles);
          return shape;
      }

      if ( type=== "petri:empty_transition"){
          const { width, height} = element;
          const r = 0;
          console.log("empty_transition")
          const isEnabled = this.simulationService.isTransitionEnabled(element);
          const shape = draw_empty_transition(parentGfx, width, height, r, this.styles, undefined, isEnabled);
          // do not render a label for empty transition
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

function draw_rect(parentGfx, width, height, r, styles, attrs, isEnabled){

    attrs= styles.computeStyle(attrs || {},{
        stroke: "black",
        strokeWidth: 2, 
        fill: isEnabled ? "lightgreen" : "white"
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

    return rect 

}



function draw_frame(parentGfx, width, height, r, styles, attrs){

    attrs= styles.computeStyle(attrs || {},{
        stroke: "black",
        strokeWidth: 2, 
        fill: "none",
        strokeDasharray: "4,4"
    })


    if (attrs.fill === "none"){
        delete attrs.fillOpacity
    }

    const frame= svgCreate("rect");

    svgAttr(frame,{
        x: 0,
        y: 0, 
        width: width,
        height: height, 
        rx: r, 
        ry: r
    });

    svgAttr(frame,attrs);

    svgAppend(parentGfx, frame);

    return frame

}


function draw_empty_transition(parentGfx, width, height, r, styles, attrs, isEnabled){

    attrs= styles.computeStyle(attrs || {},{
        stroke: "black",
        strokeWidth: 2, 
        fill: isEnabled ? "lightgreen" : "black",
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

    return rect 

}


//Arrows related helpers

function createArrowMarker(parentGfx, id, stroke) {
    // create the marker only once
    let defs = parentGfx.ownerSVGElement.querySelector("defs");
    if (!defs) {
      defs = svgCreate("defs");
      svgAppend(parentGfx.ownerSVGElement, defs);
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

function draw_label(parentGfx, element, styles){
  const textValue = element.businessObject?.name??""

  const attrs = styles.computeStyle({}, {
    fill: 'black',
    fontSize: 12
  });

  const text = svgCreate('text');
  let x, y, textAnchor, baseline;
  if (element.type === 'petri:place') {
    
    // place label just outside the circle boundary
    const r = Math.min(element.width, element.height) / 2;
    const cx = element.width / 2;
    const cy = element.height / 2;
    const margin = 4;
    const offset = r / Math.SQRT2; // ~45°
    x = cx + offset + margin;
    y = cy + offset + margin;
    textAnchor = 'start';
    baseline = 'hanging';
  } else {
    // default: centered
    x = element.width / 2;
    y = element.height / 2;
    textAnchor = 'middle';
    baseline = 'middle';
  }

  svgAttr(text, {
    x,
    y,
    'text-anchor': textAnchor,
    'dominant-baseline': baseline
  });

  svgAttr(text, attrs);
  text.textContent = String(textValue);
  svgAppend(parentGfx, text);

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


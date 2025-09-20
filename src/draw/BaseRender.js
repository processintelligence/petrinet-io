import { create as svgCreate, attr as svgAttr, append as svgAppend } from 'tiny-svg';

import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer.js';



const HIGH_PRIORITY = 1500;


export default class CustomRenderer extends BaseRenderer{

    static $inject = ["eventBus", "styles"]
    

    constructor(eventBus, styles){
        super(eventBus, HIGH_PRIORITY );
        this.styles = styles
    }


    canRender(element){
        console.log("canRender")
        return element.type === "petri:place" || element.type === "petri:transition" || element.type === "petri:frame" ;
    }

    drawShape(parentGfx, element){
        
        const {type} = element; 

        if(type === "petri:place"){
            const { width, height} = element;
            console.log("circle")
            return drawcircle(parentGfx, width, height,this.styles, undefined);
        }

        if ( type=== "petri:transition"){
            const { width, height} = element;
            const r = 10;
            console.log("rect")
            return drawrect(parentGfx, width,height,r,this.styles, undefined);
        }

        if ( type=== "petri:frame"){
            const { width, height} = element;
            const r = 10;
            console.log("frame")
            return drawframe(parentGfx, width,height,r,this.styles, undefined);
        }
    }

}


//helper functions 

function drawcircle(parentGfx, width, height, styles, attrs){

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

function drawrect(parentGfx, width, height, r, styles, attrs){

    attrs= styles.computeStyle(attrs || {},{
        stroke: "black",
        strokeWidth: 2, 
        fill: "white"
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



function drawframe(parentGfx, width, height, r, styles, attrs){

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
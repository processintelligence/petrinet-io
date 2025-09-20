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
        return element.type === "petri:circle";
    }

    drawShape(parentGfx, element){
        const { width, height, type} = element;
        
        if(type === "petri:circle"){
            return drawcircle(parentGfx, width, height,this.styles, undefined)
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

import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider.js';

import { isFrameElement } from 'diagram-js/lib/util/Elements.js';


export default class ExampleRuleProvider extends RuleProvider{

    static $inject = ["eventBus", "elementRegistry"];

    constructor(eventBus, elementRegistry){

    super(eventBus)
    this.elementRegistry = elementRegistry;
    }

    init(){
        this.addRule("shape.create", (context) => {

            const target = context.target; 
            const shape = context.shape; 

            return target.parent === shape.target; 
        }); 
        this.addRule("connection.create", (context) => {

            const {source, target} = context;

            if (!source || !target) { return false; }

            // disallow same-type connections
            if (source.type === "petri:place" && target.type === "petri:place"){
                return false;
            }
            if (source.type === "petri:transition" && target.type === "petri:transition"){
                return false;
            }
            if (source.type === "petri:empty_transition" && target.type === "petri:empty_transition"){
                return false;
            }
            if (source.type === "petri:transition" && target.type === "petri:empty_transition"){
                return false;
            }
            if (source.type === "petri:empty_transition" && target.type === "petri:transition"){
                return false;
            }

            // prevent duplicate connections
            const hasDuplicateDirectedConnection = Array.isArray(source.outgoing) && source.outgoing.some((connection) => connection.target === target);
            if (hasDuplicateDirectedConnection) {
                return false;
            }

            if (target.parent === source.parent) {
                return { type: 'petri:connection' };  
            }

            return false;
        }); 
        this.addRule("shape.resize", (context) => {
            const shape = context.shape; 
            
            // Allow resizing for frames
            if (isFrameElement(shape)) {
                return true;
            }
            
            // Allow resizing for petri net shapes (places and transitions)
            if (shape.type === "petri:place" || 
                shape.type === "petri:transition" || 
                shape.type === "petri:empty_transition") {
                return true;
            }
            
            // Disallow resizing for other elements
            return false;
        })
    }

}
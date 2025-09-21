import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider.js';

import { isFrameElement } from 'diagram-js/lib/util/Elements.js';


export default class ExampleRuleProvider extends RuleProvider{

    static $inject = ["eventBus"];

    constructor(eventBus){

    super(eventBus)}

    init(){
        this.addRule("shape.create", (context) => {

            const target = context.target; 
            const shape = context.shape; 

            return target.parent === shape.target; 
        }); 
        this.addRule("connection.create", (context) => {

            const {source, target} = context;

            if (!source || !target) { return false; }

            if (target.parent === source.parent) {
                return { type: 'petri:connection' };  
              }
        }); 
        this.addRule("shape.resize", (context) => {
            const shape = context.shape; 

            return isFrameElement(shape)
        })
    }

}
export default class ExamplePalleteProvider {

  static $inject =[ "create", "elementFactory", "lassoTool", "palette", "spaceTool"]

  constructor(create, elementFactory, lassoTool, palette, spaceTool){
    this.create = create; 
    this.elementFactory = elementFactory; 
    this.lassoTool = lassoTool;
    this.palette = palette; 
    this.spaceTool= spaceTool;

    palette.registerProvider(this);
  }
  
  getPaletteEntries(){

    const {create, elementFactory,lassoTool, spaceTool} = this;

    return{
      "lasso-tool": {
        group: "tools",
        className: "palette-icon-lasso-tool",
        title: "Activate Lasso Tool",
        action:{
          click: (event) => lassoTool.activateSelection(event)
        }
      },     
      "tool-separator": {
        group: "tools"
      }, 

      "create-transition": {
        group: "create",
        className: "palette-icon-create-transition",
        title: "Transition",
        action: {
          click: () => {
            const shape = elementFactory.createShape({
              width: 100,
              height: 80,
              type: "petri:transition"
            }); 

            create.start(event, shape);
          }
        }
      }, 

      "create-empty-transition": {
        group: "create",
        className: "palette-icon-create-empty-transition",
        title: "Transition",
        action: {
          click: () => {
            const shape = elementFactory.createShape({
              width: 14,
              height: 80,
              type: "petri:empty_transition"
            }); 

            create.start(event, shape);
          }
        }
      }, 
      "create-circle": {
        group: "create",
        className: "palette-icon-create-circle",
        title: "Place",
        action: {
          click: () => {
            const circleShape = elementFactory.createShape({
              width: 80,
              height: 80,
              type: "petri:place"
            });

            create.start(event, circleShape);
          }
        }
      }

    }
  }
}

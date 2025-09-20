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
      'space-tool': {
        group: 'tools',
        className: 'palette-icon-space-tool',
        title: 'Activate the create/remove space tool',
        action: {
          click: (event) => {
            spaceTool.activateSelection(event);
          }
        }
      },

      "tool-separator": {
        group: "tools"
      }, 

      "create-shape": {
        group: "create",
        className: "palette-icon-create-shape",
        title: "Create Shape",
        action: {
          click: () => {
            const shape = elementFactory.createShape({
              width: 100,
              height: 80
            }); 

            create.start(event, shape);
          }
        }
      }, 

      "create-frame": {
        group: "create",
        className: "palette-icon-create-frame",
        title: "Create Frame",
        action: {
          click: () => {

            const shape = elementFactory.createShape({
              width: 300,
              height: 200, 
              isFrame: true
            }); 

            create.start(event, shape); 

          }
        }
      }

    }


  }

}
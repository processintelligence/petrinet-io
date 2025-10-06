export default class ExamplePalleteProvider {

  static $inject =[ "create", "elementFactory", "lassoTool", "palette", "spaceTool", "simulationService"]

  constructor(create, elementFactory, lassoTool, palette, spaceTool, simulationService){
    this.create = create; 
    this.elementFactory = elementFactory; 
    this.lassoTool = lassoTool;
    this.palette = palette; 
    this.spaceTool= spaceTool;
    this.simulationService = simulationService;

    palette.registerProvider(this);
  }

 updateButton(event) {
    const button = event.target.closest('[data-action="start-simulation"]');
    if (button) {
      const isActive = this.simulationService.toggleSimulation();
      if (isActive) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    }
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
        group: "tools",
        separator: true
      },

      "create-transition": {
        group: "create",
        className: "palette-icon-create-transition",
        title: "Transition",
        action: {
          click: (event) => {
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
          click: (event) => {
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
          click: (event) => {
            const circleShape = elementFactory.createShape({
              width: 80,
              height: 80,
              type: "petri:place",
              businessObject: {
                tokens: 0
              }
            });

            create.start(event, circleShape);
          }
        }
      }, 

      "create-separator": {
        group: "create",
        separator: true
      },

      "start-simulation": {
        group: "simulation",
        className: "palette-icon-start-simulation",
        title: "Start Simulation",
        action: {
          click: (event) => {
            this.updateButton(event);
          }
        }
      }

    }
  }
}

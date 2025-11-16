export default class CustomPaletteProvider {

  static $inject =[ "create", "elementFactory", "lassoTool", "palette", "spaceTool", "simulationService", "idCounterService", "eventBus", "elementRegistry"]

  constructor(create, elementFactory, lassoTool, palette, spaceTool, simulationService, idCounterService, eventBus, elementRegistry){
    this.create = create; 
    this.elementFactory = elementFactory; 
    this.lassoTool = lassoTool;
    this.palette = palette; 
    this.spaceTool= spaceTool;
    this.simulationService = simulationService;
    this.idCounterService = idCounterService;
    this.eventBus = eventBus;
    this.elementRegistry = elementRegistry;
    palette.registerProvider(this);
  }

  toggleLabels(event) {
    this.idCounterService.toggleLabels();
    
    // Make button active when labels hidden
    const button = event.target.closest('[data-action="labels"]');
    if (button) {
      button.classList.toggle('active');
    }
    
    // Re-render all elements
    this.elementRegistry.getAll().forEach(el => {
      this.eventBus.fire('element.changed', { element: el });
    });
  }


 updateSimulationButton(event) {
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
              id: this.idCounterService.getNextTransitionId(),
              width: 70,
              height: 70,
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
              id: this.idCounterService.getNextTransitionId(),
              width: 14,
              height: 70,
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
              id: this.idCounterService.getNextPlaceId(),
              width: 50,
              height: 50,
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
            this.updateSimulationButton(event);
          }
        }
      },

      "simulation-separator": {
        group: "simulation",
        separator: true
      },

      "labels": {
        group: "labels",
        className: "palette-icon-labels",
        title: "Toggle Labels",
        action: {
          click: (event) => {
            this.toggleLabels(event);
          }
        }
      }

    }
  }
}
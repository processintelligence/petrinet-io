export default class CustomPaletteProvider {

  static $inject =[
    "create",
    "elementFactory",
    "lassoTool",
    "handTool",
    "palette",
    "spaceTool",
    "simulationService",
    "idCounterService",
    "eventBus",
    "elementRegistry"];

  constructor(create, elementFactory, lassoTool, handTool, palette, spaceTool, simulationService, idCounterService, eventBus, elementRegistry){
    this.create = create; 
    this.elementFactory = elementFactory; 
    this.lassoTool = lassoTool;
    this.handTool = handTool;
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

    const {create, elementFactory, lassoTool, handTool, spaceTool} = this;

    return{
      'hand-tool': {
        group: 'tools',
        className: 'bpmn-icon-hand-tool',
        title: 'Activate the hand tool',
        action: {
          click: function (event) {
            handTool.activateHand(event);
          }
        }
      },
      "lasso-tool": {
        group: "tools",
        className: "bpmn-icon-lasso-tool",
        title: "Activate Lasso Tool",
        action:{
          click: (event) => lassoTool.activateSelection(event)
        }
      },
      'space-tool': {
        group: 'tools',
        className: 'bpmn-icon-space-tool',
        title: 'Activate the create/remove space tool',
        action: {
          click: function (event) {
            spaceTool.activateSelection(event);
          }
        }
      },
      "tool-separator": {
        group: "tools",
        separator: true
      },

      "create-circle": {
        group: "create",
        className: "bpmn-icon-start-event-none",
        title: "Place",
        action: {
          click: (event) => {
            const circleShape = elementFactory.createShape({
              id: this.idCounterService.getNextPlaceId(),
              width: 30,
              height: 30,
              type: "petri:place",
              businessObject: {
                tokens: 0
              }
            });
            create.start(event, circleShape);
          }
        }
      }, 
      "create-transition": {
        group: "create",
        className: "bpmn-icon-task",
        title: "Transition",
        action: {
          click: (event) => {
            const shape = elementFactory.createShape({
              id: this.idCounterService.getNextTransitionId(),
              width: 40,
              height: 40,
              type: "petri:transition"
            }); 

            create.start(event, shape);
          }
        }
      }, 

      "create-empty-transition": {
        group: "create",
        className: "palette-icon-create-empty-transition",
        title: "Silent transition",
        action: {
          click: (event) => {
            const shape = elementFactory.createShape({
              id: this.idCounterService.getNextTransitionId(),
              width: 10,
              height: 50,
              type: "petri:empty_transition"
            }); 

            create.start(event, shape);
          }
        }
      },

      "create-separator": {
        group: "create",
        separator: true
      },

      "start-simulation": {
        group: "simulation",
        className: "fa-regular fa-circle-play",
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
        className: "fa-solid fa-tags",
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
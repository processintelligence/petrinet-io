export default class EditingProvider {

    static $inject = [ 'eventBus', 'directEditing', 'canvas', 'simulationService' ];
  
    constructor(eventBus, directEditing, canvas, simulationService) {
      this.eventBus = eventBus;
      this.directEditing = directEditing;
      this.canvas = canvas;
      this.simulationService = simulationService;
  
      directEditing.registerProvider(this);
  
      eventBus.on('element.dblclick', 1000, (event) => {
        const element = event && event.element;
  
        if (!element)
          return;
        if(element.type === "petri:place") {
          this.getTokens(element);
        } else {
          this.directEditing.activate(element);
        }
      });

      // Intercept clicks outside the editing box to complete instead of cancel
      eventBus.on('element.mousedown', 1500, (event) => {
        if (directEditing.isActive()) {
          // Complete the editing to save the text
          directEditing.complete();
        }
      });
      
    }
  
    activate(element) {
      if (element.type !== 'petri:place' && element.type !== 'petri:transition') {
        return null;
      }
  
      const text = element.businessObject?.name || '';
  
      const viewbox = this.canvas.viewbox();
      const zoom = viewbox.scale || 1;
  
      return {
        bounds: {
          x: element.x * zoom - viewbox.x * zoom,
          y: element.y * zoom - viewbox.y * zoom,
          width: element.width * zoom,
          height: element.height * zoom
        },
        text: text,
        style: {
          fontFamily: 'Arial, sans-serif',
          fontSize: "12" * zoom + "px",
        }
      };
    }
  
    update(element, newText, oldText, bounds) {
      if (!element.businessObject) {
        element.businessObject = {};
      }
  
      element.businessObject.name = newText;
  
      this.eventBus.fire('element.changed', { element });
    }

    getTokens(element){
      // Check if element exists first
      if(!element){
        return;
      }
      
      // Check if element is a place
      if(element.type !== "petri:place"){
        return;
      }

      // Initialize businessObject if it doesn't exist
      if (!element.businessObject) {
        element.businessObject = {};
      }
      
      // Get current tokens, default to 0 if not set
      const currentTokens = element.businessObject.tokens || 0;
      const updateTokens = window.prompt("Enter the number of tokens", currentTokens);
      if(updateTokens !== null){
        // Convert to number and validate
        const tokenCount = parseInt(updateTokens, 10);
        if(!isNaN(tokenCount) && tokenCount >= 0){
          element.businessObject.tokens = tokenCount;
          this.eventBus.fire('element.changed', { element });
          if(this.simulationService.isActive){
            this.simulationService.updateEnabledTransitions();
          }
        } else {
          alert("Please enter a valid number of tokens (0 or greater)");
        }
      }
    }
  }


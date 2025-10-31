export default class MenuProvider {

    static $inject = ['eventBus', 'popupMenu', "simulationService"];

    constructor(eventBus, popupMenu, simulationService){
        this.eventBus = eventBus;
        this.popupMenu = popupMenu;
        this.simulationService = simulationService;
        popupMenu.registerProvider("menu", this);
    }

    getPopupMenuEntries(element){
      const entries = {};

      // Add "Set Tokens" option for places
      if(element.type === "petri:place"){
        entries.tokens = {
          label: 'Set Tokens',
          action: () => {
            this.getTokens(element);
          }
        };
      }

      if(element.type === "petri:connection"){
        entries.label = {
          label: 'Set Label',
          action: () => {
            this.setLabel(element);
          }
        };
      }

      // Add "Properties" option for all elements
      entries.properties = {
        label: 'Properties',
        action: () => {
          this.showProperties(element);
        }
      };

      return entries;
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

    showProperties(element){
      if(!element){
        return;
      }

      // Build properties info
      let info = `Element Properties\n\n`;
      info += `Type: ${element.type}\n`;
      info += `ID: ${element.id}\n`;
      
      if(element.width && element.height){
        info += `Size: ${element.width} x ${element.height}\n`;
      }
      
      if(element.x !== undefined && element.y !== undefined){
        info += `Position: (${element.x}, ${element.y})\n`;
      }

      if(element.businessObject){
        if(element.businessObject.name){
          info += `Name: ${element.businessObject.name}\n`;
        }
        if(element.businessObject.tokens !== undefined){
          info += `Tokens: ${element.businessObject.tokens}\n`;
        }
      }

      alert(info);
    }

    setLabel(element){
      if(!element){
        return; 
      }
      if(element.businessObject === undefined){
        element.businessObject = {};
      }

      let updateLabel = window.prompt("Enter the new label", element.businessObject.name);

      if(updateLabel !== null){
        element.businessObject.name = updateLabel;
        this.eventBus.fire('element.changed', { element });
      }
    }

}

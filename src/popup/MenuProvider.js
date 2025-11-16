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

      if(element.type === "petri:connection" || element.type === "petri:place"){
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

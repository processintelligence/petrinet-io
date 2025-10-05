export default class MenuProvider {

    static $inject = ['eventBus', 'popupMenu'];

    constructor(eventBus, popupMenu){
        this.eventBus = eventBus;
        this.popupMenu = popupMenu;

        popupMenu.registerProvider("menu", this);
    }

    getPopupMenuEntries(element){
      if(element.type === "petri:place"){
        return {
          'Tokens': {
            label: 'Tokens',
            action: () => {
              this.getTokens(element);
            }
          }
        };
      }
      return {};
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
        } else {
          alert("Please enter a valid number of tokens (0 or greater)");
        }
      }
    }
}




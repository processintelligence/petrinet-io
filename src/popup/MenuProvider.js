export default class MenuProvider {

    static $inject = ['eventBus', 'popupMenu'];

    constructor(eventBus, popupMenu){
        this.eventBus = eventBus;
        this.popupMenu = popupMenu;

        popupMenu.registerProvider("menu", this);

    }

    getPopupMenuEntries(element){
      if(element.type === "petri:place"){
      return({
        'Tockens': {
          label: 'Tockens',
          action: () => alert('Hello from ' + element.id)
        }
      })
    }
  }

  
}



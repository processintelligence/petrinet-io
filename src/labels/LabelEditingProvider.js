export default class LabelEditingProvider {

    static $inject = [ 'eventBus', 'directEditing', 'canvas' ];
  
    constructor(eventBus, directEditing, canvas) {
      this.eventBus = eventBus;
      this.directEditing = directEditing;
      this.canvas = canvas;
  
      directEditing.registerProvider(this);
  
      eventBus.on('element.dblclick', 1000, (event) => {
        const element = event && event.element;
  
        if (!element) return;
  
        directEditing.activate(element);
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
        text: text
      };
    }
  
    update(element, newText, oldText, bounds) {
      if (!element.businessObject) {
        element.businessObject = {};
      }
  
      element.businessObject.name = newText;
  
      this.eventBus.fire('element.changed', { element });
    }
  }
  
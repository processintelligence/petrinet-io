export default class LabelEditingProvider{

    static $inject = [ 'eventBus', 'directEditing', 'modeling' ];

    constructor(eventBus, directEditing, modeling){
        this.eventBus = eventBus;
        this.directEditing = directEditing;
        this.modeling = modeling;

        // simple, fallback label editing via prompt + refresh
        eventBus.on('element.dblclick', 1000, (event) => {
            const element = event && event.element;
            if (!element) { return; }

            if (element.type === 'petri:empty_transition') {
                try { this.directEditing.cancel(); } catch (e) {}
                return false;
            }

            const current = element.businessObject?.name || element.label || element.name || '';
            // fallback editing UI; replace later with proper direct-editing
            const updated = window.prompt('Edit label', current);
            if (updated === null) { return; }

            // Update the business object if it exists, otherwise create one
            if (!element.businessObject) {
                element.businessObject = {};
            }
            element.businessObject.name = updated;
            
            // Trigger re-render by firing element changed event
            this.eventBus.fire('element.changed', { element });
        });
    }
}
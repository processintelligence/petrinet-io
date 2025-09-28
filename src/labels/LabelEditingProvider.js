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

            if (element.type !== "petri:place" && element.type !== "petri:transition") {
                return; 
            }

            const current = element.businessObject?.name || '';
            // fallback editing UI; replace later with proper direct-editing
            const updated = window.prompt('Edit label', current);
            if (updated === null) { return; }

            // Update the business object if it exists, otherwise create one
            if (!element.businessObject) {
                element.businessObject = {};
            }
            element.businessObject.name = updated;

            // If place, also prompt for tokens
            if (element.type === 'petri:place') {
                const currentTokens = Number.isFinite(element.businessObject.tokens) ? element.businessObject.tokens : 0;
                const tokenInput = window.prompt('Set tokens (0+)', String(currentTokens));
                if (tokenInput !== null) {
                    const parsed = parseInt(tokenInput, 10);
                    element.businessObject.tokens = Number.isFinite(parsed) && parsed >= 0 ? parsed : currentTokens;
                }
            }

            // Trigger re-render by firing element changed event
            this.eventBus.fire('element.changed', { element });
        });
    }
}
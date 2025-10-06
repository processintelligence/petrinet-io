export default class SimulationService {

    static $inject = ["eventBus", "elementRegistry", "canvas"];

    constructor(eventBus, elementRegistry, canvas) {
        this.eventBus = eventBus;
        this.elementRegistry = elementRegistry;
        this.canvas = canvas;
        this.isActive = false;
        this.enabledTransitions = new Set();

        // Listen for element changes to update enabled transitions
        this.eventBus.on(['elements.changed', 'connection.added', 'connection.removed', 'shape.added', 'shape.removed'], () => {
            if (this.isActive) {
                this.updateEnabledTransitions();
            }
        });
    }

    toggleSimulation() {
        this.isActive = !this.isActive;
        
        if (this.isActive) {
            this.updateEnabledTransitions();
        } else {
            this.enabledTransitions.clear();
            // Trigger re-render to remove green colors
            this.refreshAllTransitions();
        }

        this.eventBus.fire('simulation.toggled', { active: this.isActive });
        
        return this.isActive;
    }

    isTransitionEnabled(element) {
        return this.enabledTransitions.has(element.id);
    }

    updateEnabledTransitions() {
        this.enabledTransitions.clear();
        
        // Get all elements
        const elements = this.elementRegistry.getAll();
        
        // Find all transitions
        const transitions = elements.filter(el => 
            el.type === 'petri:transition' || el.type === 'petri:empty_transition'
        );

        // Check each transition
        transitions.forEach(transition => {
            if (this.canTransitionFire(transition)) {
                this.enabledTransitions.add(transition.id);
            }
        });

        // Trigger re-render of all transitions
        this.refreshAllTransitions();
    }

    canTransitionFire(transition) {
        // Check if transition has incoming connections
        const incoming = transition.incoming || [];
        
        // If no incoming connections, transition can fire
        if (incoming.length === 0) {
            return true;
        }

        // Check if all incoming places have at least one token
        return incoming.every(connection => {
            const sourcePlace = connection.source;
            
            // Check if source has tokens
            const tokens = sourcePlace.businessObject?.tokens || 0;
            return tokens > 0;
        });
    }

    refreshAllTransitions() {
        const elements = this.elementRegistry.getAll();
        const transitions = elements.filter(el => 
            el.type === 'petri:transition' || el.type === 'petri:empty_transition'
        );

        transitions.forEach(transition => {
            this.eventBus.fire('element.changed', { element: transition });
        });
    }
    
}
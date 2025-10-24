export default class SimulationService {

    static $inject = ["eventBus", "elementRegistry", "canvas"];

    constructor(eventBus, elementRegistry, canvas) {
        this.eventBus = eventBus;
        this.elementRegistry = elementRegistry;
        this.canvas = canvas;
        this.isActive = false;
        this.enabledTransitions = new Set();
        this.firedTransitions = new Set(); // Track transitions that have fired

        // Listen for element changes to update enabled transitions
        this.eventBus.on(['elements.changed', 'connection.added', 'connection.removed', 'shape.added', 'shape.removed'], () => {
            if (this.isActive) {
                this.updateEnabledTransitions();
            }
        });

        this.eventBus.on("element.click", (event) => {
            const element = event.element; 
            if (element.type === "petri:transition" || element.type === "petri:empty_transition") {
                if (this.isTransitionEnabled(element)) {
                    this.fireTransition(element);
                }
            }
        });
    
    }

    toggleSimulation() {
        this.isActive = !this.isActive;

        const elements = this.elementRegistry.getAll();
        console.log(elements); 
        
        if (this.isActive) {
            this.firedTransitions.clear(); // Reset fired transitions when starting
            this.updateEnabledTransitions();
        } else {
            this.enabledTransitions.clear();
            this.firedTransitions.clear();
            // Trigger re-render to remove green/purple colors
            this.refreshAllTransitions();
        }
        
        return this.isActive;
    }

    isTransitionEnabled(element) {
        return this.enabledTransitions.has(element.id);
    }

    isTransitionFired(element) {
        return this.firedTransitions.has(element.id);
    }

    updateEnabledTransitions() {
        this.enabledTransitions.clear();
        
        // Get all elements
        const elements = this.elementRegistry.getAll();
        
        // Find all transitions
        const transitions = elements.filter(el => 
            el.type === 'petri:transition' || el.type === 'petri:empty_transition'
        );


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

    fireTransition(element) {
        // Only fire if simulation is active and transition is enabled
        if (!this.isActive || !this.isTransitionEnabled(element)) {
            return;
        }

        const incoming = element.incoming || [];
        const outgoing = element.outgoing || [];
        const affectedPlaces = [];

        // Remove tokens from input places
        incoming.forEach(connection => {
            const sourcePlace = connection.source;
            
            // Ensure businessObject exists
            if (!sourcePlace.businessObject) {
                sourcePlace.businessObject = { tokens: 0 };
            }
            
            const currentTokens = sourcePlace.businessObject.tokens || 0;
            sourcePlace.businessObject.tokens = Math.max(0, currentTokens - 1);
            affectedPlaces.push(sourcePlace);
        });

        // Add tokens to output places
        outgoing.forEach(connection => {
            const targetPlace = connection.target;
            
            // Ensure businessObject exists
            if (!targetPlace.businessObject) {
                targetPlace.businessObject = { tokens: 0 };
            }
            
            const currentTokens = targetPlace.businessObject.tokens || 0;
            targetPlace.businessObject.tokens = currentTokens + 1;
            affectedPlaces.push(targetPlace);
        });

        // Mark this transition as fired
        this.firedTransitions.add(element.id);

        // Trigger re-render of all affected places
        affectedPlaces.forEach(place => {
            this.eventBus.fire('element.changed', { element: place });
        });

        // Update which transitions are enabled
        this.updateEnabledTransitions();
    }

    
}
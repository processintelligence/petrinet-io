export default class BaseSimulationService {

    static $inject = ["eventBus", "elementRegistry", "canvas"];

    constructor(eventBus, elementRegistry, canvas) {
        this.eventBus = eventBus;
        this.elementRegistry = elementRegistry;
        this.canvas = canvas;
        this.isActive = false;
        this.initialTokenState = new Map();
        this.enabledTransitions = new Set();
        this.firedTransitions = new Set(); // Track transitions that have fired


    }

    saveInitialTokenState(){
        const elements = this.elementRegistry.getAll();     
        const places = elements.filter(el => el.type === "petri:place"); 

        places.forEach(el => {
            const tokens = el.businessObject?.tokens || 0;
            this.initialTokenState.set(el.id, tokens)
        })

    }

    resetTokensToInitial(){
        const element = this.elementRegistry.getAll(); 
        const places = element.filter(el => el.type === "petri:place"); 

        places.forEach(place => {

        const initialToken = this.initialTokenState.get(place.id) || 0; 

        if(!place.businessObject){
            place.businessObject = {tokens: 0};
        }

        place.businessObject.tokens = initialToken; 

        this.eventBus.fire("element.changed", {element:place});

    })}

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

    isTransitionEnabled(element) {
        return this.enabledTransitions.has(element.id);
    }

    isTransitionFired(element) {
        return this.firedTransitions.has(element.id);
    }
    
}
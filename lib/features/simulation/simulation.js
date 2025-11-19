import BaseSimulationService from "./BaseSimulationService.js"


export default class SimulationService extends BaseSimulationService{

    static $inject = ["eventBus", "elementRegistry", "canvas"];

    constructor(eventBus, elementRegistry, canvas) {
        super(eventBus, elementRegistry, canvas);

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
            if(this.initialTokenState.size === 0){
                this.saveInitialTokenState();
            }
            this.saveInitialTokenState();
            this.firedTransitions.clear(); // Reset fired transitions when starting
            this.updateEnabledTransitions();
        } else {
            this.enabledTransitions.clear();
            this.firedTransitions.clear();
            // Trigger re-render to remove green/purple colors
            this.refreshAllTransitions();
            this.resetTokensToInitial();
        }
        this.eventBus.fire('simulation.mode.changed', { active: this.isActive });
        return this.isActive;
    }
}
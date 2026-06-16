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
            const element = this.getSimulationClickTarget(event);

            if (!element) {
                return;
            }

            if (element.type === "petri:transition" || element.type === "petri:empty_transition") {
                if (this.isTransitionEnabled(element)) {
                    this.fireTransition(element);
                    return false;
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

    getSimulationClickTarget(event) {
        const element = event.element;

        if (!this.isActive || !element) {
            return element;
        }

        if (element.type !== "petri:connection") {
            return element;
        }

        const clickPosition = this.getDiagramClickPosition(event.originalEvent);

        if (!clickPosition) {
            return element;
        }

        return this.findTransitionAt(clickPosition) || element;
    }

    getDiagramClickPosition(originalEvent) {
        if (!originalEvent) {
            return null;
        }

        const clientX = originalEvent.clientX;
        const clientY = originalEvent.clientY;

        if (typeof clientX !== "number" || typeof clientY !== "number") {
            return null;
        }

        const container = this.canvas.getContainer();
        const bounds = container.getBoundingClientRect();
        const viewbox = this.canvas.viewbox();
        const scale = viewbox.scale || 1;

        return {
            x: viewbox.x + (clientX - bounds.left) / scale,
            y: viewbox.y + (clientY - bounds.top) / scale
        };
    }

    findTransitionAt(position) {
        const elements = this.elementRegistry.getAll();

        for (let i = elements.length - 1; i >= 0; i--) {
            const element = elements[i];

            if (!this.isTransition(element)) {
                continue;
            }

            if (this.containsPosition(element, position)) {
                return element;
            }
        }

        return null;
    }

    isTransition(element) {
        return element.type === "petri:transition" || element.type === "petri:empty_transition";
    }

    containsPosition(element, position) {
        return position.x >= element.x &&
            position.x <= element.x + element.width &&
            position.y >= element.y &&
            position.y <= element.y + element.height;
    }
}

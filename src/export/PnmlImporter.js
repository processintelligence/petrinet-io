export default class PnmlImporter {

    static $inject = ["canvas", "elementFactory", "elementRegistry", "modeling"]

    constructor(canvas, elementFactory, elementRegistry, modeling){
        this.canvas = canvas;
        this.elementFactory = elementFactory;
        this.elementRegistry = elementRegistry;
        this.modeling = modeling;
    }

    importPnml(pnmlContent){
        // Parse the XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(pnmlContent, "text/xml");

        // Check for parsing errors
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            console.error('XML parsing error:', parserError.textContent);
            return;
        }

        // Clear existing diagram by removing root and creating new one
        const oldRoot = this.canvas.getRootElement();
        
        // Create a new root element
        const root = this.elementFactory.createRoot();
        this.canvas.setRootElement(root);

        // Store created elements by their PNML ID for arc creation
        const elementMap = new Map();

        // Parse and create places
        const places = xmlDoc.querySelectorAll('place');
        places.forEach(placeNode => {
            const id = placeNode.getAttribute('id');
            const positionNode = placeNode.querySelector('graphics > position');
            const sizeNode = placeNode.querySelector('graphics > size');
            const nameNode = placeNode.querySelector('name > text');
            const markingNode = placeNode.querySelector('initialMarking > text');

            const x = positionNode ? parseFloat(positionNode.getAttribute('x')) : 100;
            const y = positionNode ? parseFloat(positionNode.getAttribute('y')) : 100;
            const width = sizeNode ? parseFloat(sizeNode.getAttribute('width')) : 100;
            const height = sizeNode ? parseFloat(sizeNode.getAttribute('height')) : 80;
            const name = nameNode ? nameNode.textContent : '';
            const tokens = markingNode ? parseInt(markingNode.textContent) : 0;

            const place = this.elementFactory.createShape({
                type: 'petri:place',
                x: x,
                y: y,
                width: width,
                height: height,
                businessObject: {
                    name: name,
                    tokens: tokens
                }
            });

            this.canvas.addShape(place, root);
            elementMap.set(id, place);
        });

        // Parse and create transitions
        const transitions = xmlDoc.querySelectorAll('transition');
        transitions.forEach(transitionNode => {
            const id = transitionNode.getAttribute('id');
            const positionNode = transitionNode.querySelector('graphics > position');
            const sizeNode = transitionNode.querySelector('graphics > size');
            const nameNode = transitionNode.querySelector('name > text');

            const x = positionNode ? parseFloat(positionNode.getAttribute('x')) : 100;
            const y = positionNode ? parseFloat(positionNode.getAttribute('y')) : 100;
            const width = sizeNode ? parseFloat(sizeNode.getAttribute('width')) : 100;
            const height = sizeNode ? parseFloat(sizeNode.getAttribute('height')) : 80;
            const name = nameNode ? nameNode.textContent : '';

            const transition = this.elementFactory.createShape({
                type: 'petri:transition',
                x: x,
                y: y,
                width: width,
                height: height,
                businessObject: {
                    name: name
                }
            });

            this.canvas.addShape(transition, root);
            elementMap.set(id, transition);
        });

        // Parse and create arcs
        const arcs = xmlDoc.querySelectorAll('arc');
        arcs.forEach(arcNode => {
            const sourceId = arcNode.getAttribute('source');
            const targetId = arcNode.getAttribute('target');
            
            const sourceElement = elementMap.get(sourceId);
            const targetElement = elementMap.get(targetId);

            if (sourceElement && targetElement) {
                // Get waypoints from graphics/position elements
                const positionNodes = arcNode.querySelectorAll('graphics > position');
                let waypoints = [];

                if (positionNodes.length > 0) {
                    positionNodes.forEach(posNode => {
                        waypoints.push({
                            x: parseFloat(posNode.getAttribute('x')),
                            y: parseFloat(posNode.getAttribute('y'))
                        });
                    });
                } else {
                    // If no waypoints specified, create default ones
                    waypoints = [
                        { x: sourceElement.x + sourceElement.width / 2, y: sourceElement.y + sourceElement.height / 2 },
                        { x: targetElement.x + targetElement.width / 2, y: targetElement.y + targetElement.height / 2 }
                    ];
                }

                const connection = this.elementFactory.createConnection({
                    type: 'petri:connection',
                    waypoints: waypoints,
                    source: sourceElement,
                    target: targetElement
                });

                this.canvas.addConnection(connection, root);
            } else {
                console.warn(`Could not create arc: source=${sourceId}, target=${targetId} not found`);
            }
        });

        console.log('PNML imported successfully');
    }

    loadFromFile() {
        // Create file input element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pnml,.xml';

        input.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target.result;
                    this.importPnml(content);
                };
                reader.readAsText(file);
            }
        };

        input.click();
    }
}


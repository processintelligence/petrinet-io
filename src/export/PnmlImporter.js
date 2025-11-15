export default class PnmlImporter {

    static $inject = ["canvas", "elementFactory", "elementRegistry", "modeling", "idCounterService"]

    constructor(canvas, elementFactory, elementRegistry, modeling, idCounterService){
        this.canvas = canvas;
        this.elementFactory = elementFactory;
        this.elementRegistry = elementRegistry;
        this.modeling = modeling;
        this.idCounterService = idCounterService;
        this.defaultPnml = false;
    }


    findLabel(parentNode) {
        // Get all direct children of the parent node
        const children = Array.from(parentNode.children);
        
        // Look for any child element (except graphics and toolspecific) that has a <text> child
        for (const child of children) {
            if (child.tagName === 'graphics' || child.tagName === 'toolspecific' || child.tagName === "initialMarking" ) {
                continue;
            }
            
            const textNode = child.querySelector('text');
            if (textNode) {

                if(child.tagName === "inscription" && textNode.textContent.trim() === "1"){
                    continue;
                }
                // Found a label element with text
                const text = textNode.textContent || '';
                
                // Try to find offset in graphics > offset
                const offsetNode = child.querySelector('graphics > offset');
                const offsetX = offsetNode ? parseFloat(offsetNode.getAttribute('x')) : null;
                const offsetY = offsetNode ? parseFloat(offsetNode.getAttribute('y')) : null;
                
                return { text, offsetX, offsetY };
            }
        }
        
        return null;
    }

    importPnml(pnmlContent){
        // Clear the canvas before importing
        const currentRoot = this.canvas.getRootElement();
        if (currentRoot) {
            // Get all elements that are children of the root (shapes and connections)
            const elementsToRemove = this.elementRegistry.filter(element => 
                element.parent === currentRoot && element !== currentRoot
            );
            if (elementsToRemove.length > 0) {
                // Remove all existing elements (but not the root itself)
                this.modeling.removeElements(elementsToRemove);
            }
        }
        
        // Parse the XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(pnmlContent, "text/xml");

        // Check for parsing errors
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            console.error('XML parsing error:', parserError.textContent);
            return;
        }
        
        // Create a new root element
        const root = this.elementFactory.createRoot();
        this.canvas.setRootElement(root);

        // Remove all finalMarking and finalmarkings elements from the document
        // Handle both camelCase and lowercase variations
        const finalMarkings1 = xmlDoc.querySelectorAll('finalMarking');
        const finalMarkings2 = xmlDoc.querySelectorAll('finalmarkings');
        [...finalMarkings1, ...finalMarkings2].forEach(marking => marking.remove());
        
        // Store created elements by their PNML ID for arc creation
        const elementMap = new Map();


        // Parse and create places
        const places = xmlDoc.querySelectorAll('place');
        places.forEach(placeNode => {
            const id = placeNode.getAttribute('id');
            const positionNode = placeNode.querySelector('graphics > position');
            const dimensionNode = placeNode.querySelector('graphics > dimension');
            const markingNode = placeNode.querySelector('initialMarking > text');

            const x = positionNode ? parseFloat(positionNode.getAttribute('x')) : 100;
            const y = positionNode ? parseFloat(positionNode.getAttribute('y')) : 100;
            const width = this.defaultPnml?  50 : ( dimensionNode? parseFloat(dimensionNode.getAttribute('x')) :  50 );
            const height = this.defaultPnml?  50 : ( dimensionNode? parseFloat(dimensionNode.getAttribute('y')) :  50  );
            const tokens = markingNode ? parseInt(markingNode.textContent) : 0;

            
            // Find any label element (name, or any other non-core element with text)
            const label = this.findLabel(placeNode);
            const name = label ? label.text : '';
            const labelOffsetX = label ? label.offsetX : null;
            const labelOffsetY = label ? label.offsetY : null;

            const place = this.elementFactory.createShape({
                id: id,
                type: 'petri:place',
                x: x,
                y: y,
                width: width,
                height: height,
                businessObject: {
                    name: name,
                    tokens: tokens,
                    // Only add labelOffset if it exists in PNML
                    ...(labelOffsetX !== null && labelOffsetY !== null && {
                        labelOffset: { x: labelOffsetX, y: labelOffsetY }
                    })
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
            const dimensionNode = transitionNode.querySelector('graphics > dimension');

            const x = positionNode ? parseFloat(positionNode.getAttribute('x')) : 100;
            const y = positionNode ? parseFloat(positionNode.getAttribute('y')) : 100;
            const width = this.defaultPnml?  70 : ( dimensionNode? parseFloat(dimensionNode.getAttribute('x')) :  70 );
            const height = this.defaultPnml?  70 : ( dimensionNode? parseFloat(dimensionNode.getAttribute('y')) :  70  );
            
            // Find any label element (name, or any other non-core element with text)
            const label = this.findLabel(transitionNode);
            const name = label ? label.text : '';
            const labelOffsetX = label ? label.offsetX : null;
            const labelOffsetY = label ? label.offsetY : null;

            // Check for toolspecific to determine if it's an empty transition
            // Look in two places: direct child of transition, or inside graphics
            let isEmptyTransition = false;
            
            // Check direct child: <transition><toolspecific>
            const toolspecificDirect = transitionNode.querySelector(':scope > toolspecific');
            if (toolspecificDirect && toolspecificDirect.getAttribute('tool') === 'petrinet.io') {
                const propertyNode = toolspecificDirect.querySelector('property[key="transitionType"]');
                if (propertyNode && propertyNode.getAttribute('value') === 'empty') {
                    isEmptyTransition = true;
                }
            }
            
            // Check inside graphics: <transition><graphics><toolspecific>
            if (!isEmptyTransition) {
                const toolspecificGraphics = transitionNode.querySelector('graphics > toolspecific');
                if (toolspecificGraphics && toolspecificGraphics.getAttribute('tool') === 'petrinet.io') {
                    const propertyNode = toolspecificGraphics.querySelector('property[key="transitionType"]');
                    if (propertyNode && propertyNode.getAttribute('value') === 'empty') {
                        isEmptyTransition = true;
                    }
                }
            }

            // Create the appropriate transition type
            const transitionType = isEmptyTransition ? 'petri:empty_transition' : 'petri:transition';
            
            
            const transition = this.elementFactory.createShape({
                id: id,
                type: transitionType,
                x: x,
                y: y,
                width: width,
                height: height,
                businessObject: {
                    name: name,
                    // Only add labelOffset if it exists in PNML
                    ...(labelOffsetX !== null && labelOffsetY !== null && {
                        labelOffset: { x: labelOffsetX, y: labelOffsetY }
                    })
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
                // Calculate start and end points from source/target centers
                const startPoint = {
                    x: sourceElement.x + sourceElement.width / 2,
                    y: sourceElement.y + sourceElement.height / 2
                };
                const endPoint = {
                    x: targetElement.x + targetElement.width / 2,
                    y: targetElement.y + targetElement.height / 2
                };

                // Get intermediate waypoints from graphics/position elements
                const positionNodes = arcNode.querySelectorAll('graphics > position');
                let waypoints = [startPoint]; // Start with source point

                // Add intermediate waypoints (bend points) from PNML
                if (positionNodes.length > 0) {
                    positionNodes.forEach(posNode => {
                        waypoints.push({
                            x: parseFloat(posNode.getAttribute('x')),
                            y: parseFloat(posNode.getAttribute('y'))
                        });
                    });
                }

                waypoints.push(endPoint); // End with target point

                // Find any label element (inscription, name, or any other non-core element with text)
                const label = this.findLabel(arcNode);
                const name = label ? label.text : '';
                const labelOffsetX = label ? label.offsetX : null;
                const labelOffsetY = label ? label.offsetY : null;

                const arcId = arcNode.getAttribute('id');
                const connection = this.elementFactory.createConnection({
                    id: arcId, // Preserve the arc ID from PNML
                    type: 'petri:connection',
                    waypoints: waypoints,
                    source: sourceElement,
                    target: targetElement,
                    businessObject: {
                        name: name,
                        // Only add labelOffset if it exists in PNML
                        ...(labelOffsetX !== null && labelOffsetY !== null && {
                            labelOffset: { x: labelOffsetX, y: labelOffsetY }
                        })
                    }
                });

                this.canvas.addConnection(connection, root);
            } 

        });
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


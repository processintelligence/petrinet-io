/**
 * Imports PNML (Petri Net Markup Language) files into the diagram
 * Uses specialized parsers for each element type
 */
import PlaceParser from './parsers/PlaceParser.js';
import TransitionParser from './parsers/TransitionParser.js';
import ArcParser from './parsers/ArcParser.js';

export default class PnmlImporter {

    static $inject = ["canvas", "elementFactory", "elementRegistry", "modeling", "idCounterService"]

    constructor(canvas, elementFactory, elementRegistry, modeling, idCounterService) {
        this.canvas = canvas;
        this.elementFactory = elementFactory;
        this.elementRegistry = elementRegistry;
        this.modeling = modeling;
        this.idCounterService = idCounterService;
        this.defaultPnml = false;
    }

    // Find label information from XML node
    findLabel(parentNode) {
        const children = Array.from(parentNode.children);

        // Search for label text and offset in XML node
        for (const child of children) {
            if (child.tagName === 'graphics' || child.tagName === 'toolspecific' || child.tagName === "initialMarking") {
                continue;
            }

            const textNode = child.querySelector('text');
            if (textNode) {
                // Skip default arc weights
                if (child.tagName === "inscription" && textNode.textContent.trim() === "1") {
                    continue;
                }
                const text = textNode.textContent || '';

                // Get label offset if exists
                const offsetNode = child.querySelector('graphics > offset');
                const offsetX = offsetNode ? parseFloat(offsetNode.getAttribute('x')) : null;
                const offsetY = offsetNode ? parseFloat(offsetNode.getAttribute('y')) : null;

                return { text, offsetX, offsetY };
            }
        }

        return null;
    }

    // Import PNML content into the diagram
    importPnml(pnmlContent) {
        try {
            // Clear existing elements
            this._clearCanvas();

            // Parse XML content
            const xmlDoc = this._parseXml(pnmlContent);
            if (!xmlDoc) return;

            // Create root and element map for references
            const root = this._createRoot();
            const elementMap = new Map();

            // Parse elements in order (places/transitions first, then arcs)
            this._parsePlaces(xmlDoc, root, elementMap);
            this._parseTransitions(xmlDoc, root, elementMap);
            this._parseArcs(xmlDoc, root, elementMap);
        } catch (error) {
            console.error('Error in importPnml:', error);
            alert('Import failed: ' + error.message);
        }
    }

    // Remove all existing elements from canvas
    _clearCanvas() {
        const currentRoot = this.canvas.getRootElement();
        if (currentRoot) {
            const elementsToRemove = this.elementRegistry.filter(element =>
                element.parent === currentRoot && element !== currentRoot
            );
            if (elementsToRemove.length > 0) {
                this.modeling.removeElements(elementsToRemove);
            }
        }
    }

    // Parse XML string and clean up unwanted nodes
    _parseXml(pnmlContent) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(pnmlContent, "text/xml");

        // Check for parsing errors
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            console.error('XML parsing error:', parserError.textContent);
            return null;
        }

        // Remove final marking nodes (not needed for display)
        const finalMarkings1 = xmlDoc.querySelectorAll('finalMarking');
        const finalMarkings2 = xmlDoc.querySelectorAll('finalmarkings');
        [...finalMarkings1, ...finalMarkings2].forEach(marking => marking.remove());

        return xmlDoc;
    }

    // Create and set the canvas root element
    _createRoot() {
        const root = this.elementFactory.createRoot();
        this.canvas.setRootElement(root);
        return root;
    }

    // Parse all place elements from XML
    _parsePlaces(xmlDoc, root, elementMap) {
        const places = xmlDoc.querySelectorAll('place');
        places.forEach(placeNode => {
            const place = PlaceParser.parse(
                placeNode,
                this.elementFactory,
                this.canvas,
                root,
                this.defaultPnml,
                this.findLabel.bind(this)
            );
            // Store in map for arc connections
            elementMap.set(place.id, place);
        });
    }

    // Parse all transition elements from XML
    _parseTransitions(xmlDoc, root, elementMap) {
        const transitions = xmlDoc.querySelectorAll('transition');
        transitions.forEach(transitionNode => {
            const transition = TransitionParser.parse(
                transitionNode,
                this.elementFactory,
                this.canvas,
                root,
                this.defaultPnml,
                this.findLabel.bind(this)
            );
            // Store in map for arc connections
            elementMap.set(transition.id, transition);
        });
    }

    // Parse all arc (connection) elements from XML
    _parseArcs(xmlDoc, root, elementMap) {
        const arcs = xmlDoc.querySelectorAll('arc');
        arcs.forEach(arcNode => {
            // Use element map to connect sources and targets
            ArcParser.parse(
                arcNode,
                elementMap,
                this.elementFactory,
                this.canvas,
                root,
                this.findLabel.bind(this)
            );
        });
    }

    // Open file picker and load PNML file
    loadFromFile() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pnml';

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

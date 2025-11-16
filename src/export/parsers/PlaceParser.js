/**
 * Parses PNML place elements and creates diagram shapes
 */
export default class PlaceParser {
    // Parse place XML node and create place shape
    static parse(placeNode, elementFactory, canvas, root, defaultPnml, findLabel) {
        // Extract attributes from XML
        const id = placeNode.getAttribute('id');
        const positionNode = placeNode.querySelector('graphics > position');
        const dimensionNode = placeNode.querySelector('graphics > dimension');
        const markingNode = placeNode.querySelector('initialMarking > text');

        // Get position and dimensions (with defaults)
        const x = positionNode ? parseFloat(positionNode.getAttribute('x')) : 100;
        const y = positionNode ? parseFloat(positionNode.getAttribute('y')) : 100;
        const width = defaultPnml ? 50 : (dimensionNode ? parseFloat(dimensionNode.getAttribute('x')) : 50);
        const height = defaultPnml ? 50 : (dimensionNode ? parseFloat(dimensionNode.getAttribute('y')) : 50);
        const tokens = markingNode ? parseInt(markingNode.textContent) : 0;

        // Extract label information
        const label = findLabel(placeNode);
        const name = label ? label.text : '';
        const labelOffsetX = label ? label.offsetX : null;
        const labelOffsetY = label ? label.offsetY : null;

        // Create place shape
        const place = elementFactory.createShape({
            id: id,
            type: 'petri:place',
            x: x,
            y: y,
            width: width,
            height: height,
            businessObject: {
                name: name,
                tokens: tokens,
                ...(labelOffsetX !== null && labelOffsetY !== null && {
                    labelOffset: { x: labelOffsetX, y: labelOffsetY }
                })
            }
        });

        // Add to canvas and return
        canvas.addShape(place, root);
        return place;
    }
}


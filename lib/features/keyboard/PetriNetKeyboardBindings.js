export default class KeyboardShortcuts {

  static $inject = [
    'eventBus',
    'modeling',
    'selection',
    'elementFactory',
    'canvas',
    'idCounterService',
    'commandStack'

  ];

  constructor(eventBus, modeling, selection, elementFactory, canvas, idCounterService, commandStack) {
    this.eventBus = eventBus;
    this.modeling = modeling;
    this.selection = selection;
    this.elementFactory = elementFactory;
    this.canvas = canvas;
    this.idCounterService = idCounterService;
    this.commandStack = commandStack;
    
    this._clipboard = { shapes: [], connections: [] }; // Internal clipboard for copy/paste

    document.addEventListener('keydown', this._handleKeyDown.bind(this));
  }

  _handleKeyDown(event) {
    if (isEditableTarget(event.target)) {
      return;
    }

    // Only handle keyboard shortcuts when the canvas is focused
    const canvasContainer = this.canvas.getContainer();
    if (!canvasContainer.contains(document.activeElement) &&
      document.activeElement !== canvasContainer &&
      document.activeElement !== document.body) {
      return;
    }

    const key = event.key.toLowerCase();

    // Undo key
    if ((event.ctrlKey || event.metaKey) && key === 'z' && !event.shiftKey) {
      this.commandStack.undo();
      event.preventDefault();
      return;
    }

    // Delete key
    if (event.key === 'Delete' || event.key === 'Backspace') {
      this._handleDelete();
      event.preventDefault();
      return;
    }

    // Copy key
    if ((event.ctrlKey || event.metaKey) && key === 'c') {
      this._handleCopy();
      event.preventDefault();
      return;
    }

    // Paste key
    if ((event.ctrlKey || event.metaKey) && key === 'v') {
      this._handlePaste();
      event.preventDefault();
    }
  }

  _handleDelete() {
    const selectedElements = this.selection.get();
    while (selectedElements.length > 0) {
      this.modeling.removeElements(selectedElements);
    }
  }

  _handleSelectAll() {
    const root = this.canvas.getRootElement();
    const allElements = this.canvas.getChildren(root);
    this.selection.select(allElements);
  }

  _handleCopy() {
    const selectedElements = this.selection.get();

    if (selectedElements.length > 0) {
      const shapes = selectedElements
        .filter(element => this._isCopyableShape(element))
        .map(element => ({
          id: element.id,
          type: element.type,
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
          businessObject: cloneBusinessObject(element.businessObject)
        }));

      const selectedShapeIds = new Set(shapes.map(shape => shape.id));
      const connections = [];
      const copiedConnectionIds = new Set();

      selectedElements
        .filter(element => this._isCopyableShape(element))
        .forEach(element => {
          (element.outgoing || []).forEach(connection => {
            if (
              connection &&
              connection.source &&
              connection.target &&
              selectedShapeIds.has(connection.source.id) &&
              selectedShapeIds.has(connection.target.id) &&
              !copiedConnectionIds.has(connection.id)
            ) {
              copiedConnectionIds.add(connection.id);
              connections.push({
                id: connection.id,
                type: connection.type,
                sourceId: connection.source.id,
                targetId: connection.target.id,
                waypoints: (connection.waypoints || []).map(waypoint => ({ ...waypoint })),
                businessObject: cloneBusinessObject(connection.businessObject)
              });
            }
          });
        });

      this._clipboard = { shapes, connections };

      console.log('Copied', shapes.length, 'elements and', connections.length, 'connections');
    }
  }

  _handlePaste() {
    if (this._clipboard.shapes.length === 0) {
      return;
    }

    const root = this.canvas.getRootElement();
    const pastePosition = this._getPastePosition();

    // Calculate the bounding box of the original elements to maintain relative positioning
    const originalBounds = this._getElementsBounds(this._clipboard.shapes);

    // Create new elements from clipboard
    const newElements = [];
    const elementMap = new Map();

    this._clipboard.shapes.forEach(elementData => {
      // Calculate relative position from the original group's top-left corner
      const relativeX = elementData.x - originalBounds.x;
      const relativeY = elementData.y - originalBounds.y;

      // Calculate final position with validation
      const finalX = pastePosition.x + relativeX;
      const finalY = pastePosition.y + relativeY;

      // Validate coordinates are finite numbers
      if (!isFinite(finalX) || !isFinite(finalY) || !isFinite(elementData.width) || !isFinite(elementData.height)) {
        console.warn('Skipping element with invalid coordinates:', elementData);
        return;
      }


      let newId;

      if (elementData.type === "petri:transition" || elementData.type === "petri:empty_transition") {
        newId = this.idCounterService.getNextTransitionId();
      } else {
        newId = this.idCounterService.getNextPlaceId();
      }

      // Create shape with all required properties
      const shape = this.elementFactory.createShape({
        id: newId,
        type: elementData.type,
        x: finalX,
        y: finalY,
        width: elementData.width,
        height: elementData.height,
        businessObject: elementData.businessObject
      });

      const newElement = this.modeling.createShape(shape, {
        x: finalX,
        y: finalY,
        width: elementData.width,
        height: elementData.height
      }, root);
      newElements.push(newElement);
      elementMap.set(elementData.id, newElement);
    });

    this._clipboard.connections.forEach(connectionData => {
      const source = elementMap.get(connectionData.sourceId);
      const target = elementMap.get(connectionData.targetId);

      if (!source || !target) {
        return;
      }

      const waypoints = connectionData.waypoints.map(waypoint => ({
        x: pastePosition.x + waypoint.x - originalBounds.x,
        y: pastePosition.y + waypoint.y - originalBounds.y
      }));

      const connection = this.modeling.createConnection(source, target, {
        id: this.idCounterService.getNextConnectionId(),
        type: connectionData.type || 'petri:connection',
        waypoints,
        businessObject: cloneBusinessObject(connectionData.businessObject)
      }, root);

      newElements.push(connection);
    });

    // Select the newly pasted elements
    this.selection.select(newElements);

    console.log('Pasted', newElements.length, 'elements');
  }

  _isCopyableShape(element) {
    return element &&
      element.type &&
      isFinite(element.x) &&
      isFinite(element.y) &&
      isFinite(element.width) &&
      isFinite(element.height);
  }

  _getPastePosition() {
    // Get the first selected element to position paste relative to it
    const selectedElements = this.selection.get();
    if (selectedElements.length > 0) {
      const referenceElement = selectedElements[0];
      return {
        x: referenceElement.x + 100,
        y: referenceElement.y + 50
      };
    }

    // Fallback to viewport center if no selection
    const viewbox = this.canvas.viewbox();
    return {
      x: viewbox.x + viewbox.width / 2,
      y: viewbox.y + viewbox.height / 2
    };
  }

  _getElementsBounds(elements) {
    if (elements.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    elements.forEach(element => {
      minX = Math.min(minX, element.x);
      minY = Math.min(minY, element.y);
      maxX = Math.max(maxX, element.x + element.width);
      maxY = Math.max(maxY, element.y + element.height);
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
}

function isEditableTarget(target) {
  if (!target) {
    return false;
  }

  const tagName = target.tagName && target.tagName.toLowerCase();

  return target.isContentEditable ||
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select';
}

function cloneBusinessObject(businessObject) {
  if (!businessObject) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(businessObject));
}

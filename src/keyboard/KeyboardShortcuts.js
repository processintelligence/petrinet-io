export default class KeyboardShortcuts {
  
  static $inject = [
    'eventBus',
    'modeling',
    'selection',
    'elementFactory',
    'canvas'
  ];

  constructor(eventBus, modeling, selection, elementFactory, canvas) {
    this.eventBus = eventBus;
    this.modeling = modeling;
    this.selection = selection;
    this.elementFactory = elementFactory;
    this.canvas = canvas;
    
    // Internal clipboard for copy/paste
    this._clipboard = [];

    this._init();
  }

  _init() {
    // Listen for keyboard events directly on the document
    document.addEventListener('keydown', this._handleKeyDown.bind(this));
  }

  _handleKeyDown(event) {
    // Only handle keyboard shortcuts when the canvas is focused
    const canvasContainer = this.canvas.getContainer();
    if (!canvasContainer.contains(document.activeElement) && 
        document.activeElement !== canvasContainer &&
        document.activeElement !== document.body) {
      return;
    }

    // Delete key
    if (event.key === 'Delete' || event.key === 'Backspace') {
      this._handleDelete();
      event.preventDefault();
    }

    // Copy key
    if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
      this._handleCopy();
      event.preventDefault();
    }

    // Paste key
    if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
      this._handlePaste();
      event.preventDefault();
    }
  }

  _handleDelete() {
    const selectedElements = this.selection.get();
    
    if (selectedElements.length > 0) {
      this.modeling.removeElements(selectedElements);
    }
  }

  _handleCopy() {
    const selectedElements = this.selection.get();
    
    if (selectedElements.length > 0) {
      // Copy element data to internal clipboard with all required properties
      this._clipboard = selectedElements
        .filter(element => {
          // Validate element has required properties
          return element && 
                 element.type && 
                 isFinite(element.x) && 
                 isFinite(element.y) && 
                 isFinite(element.width) && 
                 isFinite(element.height);
        })
        .map(element => ({
          type: element.type,
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
          businessObject: element.businessObject ? { ...element.businessObject } : undefined
        }));
      
      console.log('Copied', this._clipboard.length, 'elements');
    }
  }

  _handlePaste() {
    if (this._clipboard.length === 0) {
      return;
    }
    
    const root = this.canvas.getRootElement();
    const pastePosition = this._getPastePosition();
    
    // Calculate the bounding box of the original elements to maintain relative positioning
    const originalBounds = this._getElementsBounds(this._clipboard);
    
    // Create new elements from clipboard
    const newElements = [];
    
    this._clipboard.forEach((elementData, index) => {
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
      
      // Create shape with all required properties
      const shape = this.elementFactory.createShape({
        type: elementData.type,
        x: finalX,
        y: finalY,
        width: elementData.width,
        height: elementData.height,
        businessObject: elementData.businessObject
      });
      
      const newElement = this.modeling.createShape(shape, { x: finalX, y: finalY }, root);
      newElements.push(newElement);
    });
    
    // Select the newly pasted elements
    this.selection.select(newElements);
    
    console.log('Pasted', newElements.length, 'elements');
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

export default class SvgExporter {

    static $inject = ["canvas", "elementRegistry", "simulationService"];

    constructor(canvas, elementRegistry, simulationService) {
        this.canvas = canvas;
        this.elementRegistry = elementRegistry;
        this.simulationService = simulationService;
    }

    exportSvg(filename = 'petri-net.svg', options = {}) {
        return new Promise((resolve, reject) => {
            try {
                const canvas = this.canvas;
                const svgContainer = canvas.getContainer();
                
                // Get the main SVG element
                const svg = svgContainer.querySelector('svg');
                if (!svg) {
                    throw new Error('SVG element not found');
                }
                
                // Get the viewport layer (contains all diagram elements)
                const viewport = svgContainer.querySelector('.layer-root-0');
                if (!viewport) {
                    throw new Error('Viewport layer not found');
                }
                
                // Get defs for markers/patterns
                const defs = svg.querySelector('defs');
                
                // Calculate bounding box of all elements
                const bounds = this._calculateBounds();
                
                // Create the SVG content
                const contents = this._getInnerSVG(viewport);
                const defsContent = defs ? '<defs>' + this._getInnerSVG(defs) + '</defs>' : '';
                
                // Build the complete SVG
                const svgString = 
                    '<?xml version="1.0" encoding="utf-8"?>\n' +
                    '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
                    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
                         'width="' + bounds.width + '" height="' + bounds.height + '" ' +
                         'viewBox="' + bounds.minX + ' ' + bounds.minY + ' ' + bounds.width + ' ' + bounds.height + '" version="1.1">' +
                        defsContent + contents +
                    '</svg>';
                
                // Download the SVG
                this._downloadSvgString(svgString, filename);
                
                resolve({ svg: svgString });
                
            } catch (error) {
                reject(error);
            }
        });
    }


    _calculateBounds() {
        const elements = this.elementRegistry.getAll();
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        elements.forEach(element => {
            // Handle shapes (places, transitions, frames)
            if (element.width && element.height) {
                minX = Math.min(minX, element.x);
                minY = Math.min(minY, element.y);
                maxX = Math.max(maxX, element.x + element.width);
                maxY = Math.max(maxY, element.y + element.height);
            }
            
            // Handle connections (arcs)
            if (element.waypoints) {
                element.waypoints.forEach(point => {
                    minX = Math.min(minX, point.x);
                    minY = Math.min(minY, point.y);
                    maxX = Math.max(maxX, point.x);
                    maxY = Math.max(maxY, point.y);
                });
            }
        });
        
        // If no elements found, use default bounds
        if (minX === Infinity) {
            minX = 0;
            minY = 0;
            maxX = 800;
            maxY = 600;
        }
        
        // Add padding
        const padding = 40;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;
        
        return {
            minX,
            minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    _getInnerSVG(element) {
        const serializer = new XMLSerializer();
        let innerHTML = '';
        
        for (let i = 0; i < element.childNodes.length; i++) {
            innerHTML += serializer.serializeToString(element.childNodes[i]);
        }
        
        return innerHTML;
    }

    _downloadSvgString(svgString, filename) {
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        URL.revokeObjectURL(url);
    }
}


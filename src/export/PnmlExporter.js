/**
 * Exports Petri net diagrams to PNML (Petri Net Markup Language) format
 * Uses specialized builders for each element type
 */
import { buildPlaceXml } from './builders/PlaceBuilder.js';
import { buildTransitionXml } from './builders/TransitionBuilder.js';
import { buildEmptyTransitionXml } from './builders/EmptyTransitionBuilder.js';
import { buildArcXml } from './builders/ArcBuilder.js';

export default class PnmlExporter {

    static $inject = ["canvas", "elementRegistry"]

    constructor(canvas, elementRegistry){
        this.canvas = canvas;
        this.elementRegistry = elementRegistry;
    }

    // Generate PNML XML string from current diagram
    getPnmlString() {
        const root = this.canvas.getRootElement();
        const elements = this.elementRegistry.filter(element => 
            element.parent === root
        );
    
        let pnml = this._getXmlHeader();
        
        // Build XML for each element using appropriate builder
        elements.forEach(element => {
            if (element.type === "petri:place") {
                pnml += buildPlaceXml(element);
            } else if (element.type === "petri:transition") {
                pnml += buildTransitionXml(element);
            } else if (element.type === "petri:empty_transition") {
                pnml += buildEmptyTransitionXml(element);
            } else if (element.type === "petri:connection") {
                pnml += buildArcXml(element);
            }
        });

        pnml += this._getXmlFooter();
        return pnml;
                    }
    
    // Get PNML file header
    _getXmlHeader() {
        return `<?xml version="1.0" encoding="UTF-8"?>
<pnml>
    <net id="ptnet1" type="http://www.pnml.org/version-2009/grammar/ptnet">
        <page id="top-level">
`;
    }

    // Get PNML file footer
    _getXmlFooter() {
        return `        </page>
    </net>
</pnml>`;
    }

    // Export diagram as PNML file download
    exportPnml(filename = 'petri-net.pnml'){
        try {
        const pnml = this.getPnmlString();

            // Create and trigger download
        const blob = new Blob([pnml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error in exportPnml:', error);
            alert('Export failed: ' + error.message);
        }
    }
}

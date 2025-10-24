export default class PnmlExporter {

    static $inject = ["canvas", "elementRegistry"]

    constructor(canvas, elementRegistry){
        this.canvas = canvas;
        this.elementRegistry = elementRegistry;
    }

    exportPnml(filename = 'petri-net.pnml'){
        // Get only actual Petri net elements (not labels or root)
        const allElements = this.elementRegistry.getAll();
        console.log('All elements in registry:', allElements.map(e => ({ id: e.id, type: e.type })));
        
        const elements = allElements.filter(element => 
            element.type !== 'root' && 
            element.type !== 'label' &&
            element.parent  // Only include elements that have a parent (are actually in the canvas)
        );
        
        console.log('Filtered elements to export:', elements.map(e => ({ id: e.id, type: e.type })));

        // Start building PNML with opening tags
        let pnml = `<?xml version="1.0" encoding="UTF-8"?>
<pnml>
    <net id="ptnet1" type="http://www.pnml.org/version-2009/grammar/ptnet">
        <page id="top-level">
`;
        
        // Add all place elements
        elements.forEach(element => {
            if(element.type === "petri:place"){
               // Calculate relative offset for label (default to center of element)
               const labelOffsetX = element.label?.x ? element.label.x - element.x : 0;
               const labelOffsetY = element.label?.y ? element.label.y - element.y : 0;
               
               const place_element = `            <place id="${element.id}">
                <graphics>
                    <position x="${element.x}" y="${element.y}" />
                    <size width="${element.width}" height="${element.height}" />
                </graphics>
                <name>
                    <text>${element.businessObject?.name || ''}</text>
                    <graphics>
                        <offset x="${labelOffsetX}" y="${labelOffsetY}" />
                    </graphics>
                </name>
                <initialMarking>
                    <text>${element.businessObject?.tokens || 0}</text>
                </initialMarking>
            </place>
`;
               pnml += place_element;
            }
        });

        // Add all transition elements (regular and empty)
        elements.forEach(element => {
            if(element.type === "petri:transition" || element.type === "petri:empty_transition"){
               // Calculate relative offset for label (default to center of element)
               const labelOffsetX = element.label?.x ? element.label.x - element.x : 0;
               const labelOffsetY = element.label?.y ? element.label.y - element.y : 0;
               
               const transition_element = `            <transition id="${element.id}">
                <graphics>
                    <position x="${element.x}" y="${element.y}" />
                    <size width="${element.width}" height="${element.height}" />
                </graphics>
                <name>
                    <text>${element.businessObject?.name || ''}</text>
                    <graphics>
                        <offset x="${labelOffsetX}" y="${labelOffsetY}" />
                    </graphics>
                </name>
            </transition>
`;
               pnml += transition_element;
            }
        });

        // Add all arc elements (connections)
        elements.forEach(element => {
            if(element.type === "petri:connection"){
                let positions = '';
                // Add each waypoint as a position element
                if(element.waypoints && element.waypoints.length > 0){
                    element.waypoints.forEach(waypoint => {
                        positions += `                    <position x="${waypoint.x}" y="${waypoint.y}" />\n`;
                    });
                }
                
                const arc_element = `            <arc id="${element.id}" source="${element.source.id}" target="${element.target.id}">
                <graphics>
${positions}                </graphics>
            </arc>
`;
                pnml += arc_element;
            }
        });

        // Close all tags
        pnml += `        </page>
    </net>
</pnml>`;

        console.log(pnml);

        // Download the file
        const blob = new Blob([pnml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}
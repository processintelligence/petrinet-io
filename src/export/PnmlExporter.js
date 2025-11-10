export default class PnmlExporter {

    static $inject = ["canvas", "elementRegistry"]

    constructor(canvas, elementRegistry){
        this.canvas = canvas;
        this.elementRegistry = elementRegistry;
    }

    getPnmlString() {
        // Get root element
        const root = this.canvas.getRootElement();
        
        // Get only elements that are children of root (actually on the canvas)
        const elements = this.elementRegistry.filter(element => 
            element.parent === root
        );
    

        // Start building PNML with opening tags
        let pnml = `<?xml version="1.0" encoding="UTF-8"?>
<pnml>
    <net id="ptnet1" type="http://www.pnml.org/version-2009/grammar/ptnet">
        <page id="top-level">
`;
        
        // Add all place elements
        elements.forEach(element => {
            if(element.type === "petri:place"){
               // Get label offset from businessObject
               const labelOffsetX = element.businessObject?.labelOffset?.x ?? 0;
               const labelOffsetY = element.businessObject?.labelOffset?.y ?? 0;
               
               const place_element = `            <place id="${element.id}">
                <graphics>
                    <position x="${element.x}" y="${element.y}" />
                    <dimension x="${element.width}" y="${element.height}" />
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
            if(element.type === "petri:transition"){
               // Get label offset from businessObject
               const labelOffsetX = element.businessObject?.labelOffset?.x ?? 0;
               const labelOffsetY = element.businessObject?.labelOffset?.y ?? 0;
               
               const transition_element = `            <transition id="${element.id}">
                <graphics>
                    <position x="${element.x}" y="${element.y}" />
                    <dimension x="${element.width}" y="${element.height}" />
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

        elements.forEach(element => {
            if(element.type === "petri:empty_transition"){

              
              const transition_element = `            <transition id="${element.id}">
                <graphics>
                    <position x="${element.x}" y="${element.y}" />
                    <dimension x="${element.width}" y="${element.height}" />
                </graphics>
                <toolspecific tool="petrinet.io" version="1.0">
                    <property key="transitionType" value="empty" />
                </toolspecific>
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
                    for(let i=1; i<element.waypoints.length -1 ; i++){
                        const waypoint = element.waypoints[i];
                        positions += `                    <position x="${waypoint.x}" y="${waypoint.y}" />\n`;
                    }
    
                
                // Get label offset from businessObject
                const labelOffsetX = element.businessObject?.labelOffset?.x ?? 0;
                const labelOffsetY = element.businessObject?.labelOffset?.y ?? 0;
                const labelText = element.businessObject?.name || '';
                
                const arc_element = `            <arc id="${element.id}" source="${element.source.id}" target="${element.target.id}">
                <graphics>
${positions}                </graphics>
                <inscription>
                    <text>${labelText}</text>
                    <graphics>
                        <offset x="${labelOffsetX}" y="${labelOffsetY}" />
                    </graphics>
                </inscription>
            </arc>
`;
                pnml += arc_element;
            }
        }});

        // Close all tags
        pnml += `        </page>
    </net>
</pnml>`;

        return pnml;
    }

    exportPnml(filename = 'petri-net.pnml'){
        const pnml = this.getPnmlString();
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
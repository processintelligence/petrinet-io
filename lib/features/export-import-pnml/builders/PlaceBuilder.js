/**
 * Builds PNML XML string for a place element
 */

// Generate XML for a place (circle) element
export function buildPlaceXml(element) {
  const labelOffsetX = element.businessObject?.labelOffset?.x ?? 0;
  const labelOffsetY = element.businessObject?.labelOffset?.y ?? 0;
  
  return `            <place id="${element.id}">
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
}


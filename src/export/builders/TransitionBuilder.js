/**
 * Builds PNML XML string for a transition element
 */

// Generate XML for a transition (rectangle) element
export function buildTransitionXml(element) {
  const labelOffsetX = element.businessObject?.labelOffset?.x ?? 0;
  const labelOffsetY = element.businessObject?.labelOffset?.y ?? 0;
  
  return `            <transition id="${element.id}">
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
}


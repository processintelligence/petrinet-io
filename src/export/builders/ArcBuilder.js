/**
 * Builds PNML XML string for an arc (connection) element
 */

// Generate XML for an arc (connection) element
export function buildArcXml(element) {
  let positions = '';
  
  // Add intermediate waypoints (exclude start and end)
  if (element.waypoints && element.waypoints.length > 0) {
    for (let i = 1; i < element.waypoints.length - 1; i++) {
      const waypoint = element.waypoints[i];
      positions += `                    <position x="${waypoint.x}" y="${waypoint.y}" />\n`;
    }
  }
  
  const labelOffsetX = element.businessObject?.labelOffset?.x ?? 0;
  const labelOffsetY = element.businessObject?.labelOffset?.y ?? 0;
  const labelText = element.businessObject?.name || '';
  
  return `            <arc id="${element.id}" source="${element.source.id}" target="${element.target.id}">
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
}


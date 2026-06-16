/**
 * Builds PNML XML string for an empty transition element
 */

// Generate XML for an empty transition (filled rectangle) element
export function buildEmptyTransitionXml(element) {
  const colorXml = buildColorPropertiesXml(element);

  return `            <transition id="${element.id}">
                <graphics>
                    <position x="${element.x}" y="${element.y}" />
                    <dimension x="${element.width}" y="${element.height}" />
                </graphics>
                <toolspecific tool="petrinet.io" version="1.0">
                    <property key="transitionType" value="empty" />
${colorXml}
                </toolspecific>
            </transition>
`;
}

function buildColorPropertiesXml(element) {
  const colors = element.businessObject?.colors;

  if (!colors || (!colors.fill && !colors.stroke)) {
    return '';
  }

  const fill = colors.fill ? `                    <property key="backgroundColor" value="${colors.fill}" />\n` : '';
  const stroke = colors.stroke ? `                    <property key="borderColor" value="${colors.stroke}" />\n` : '';

  return fill + stroke;
}


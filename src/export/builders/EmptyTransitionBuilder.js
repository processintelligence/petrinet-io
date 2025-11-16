/**
 * Builds PNML XML string for an empty transition element
 */

// Generate XML for an empty transition (filled rectangle) element
export function buildEmptyTransitionXml(element) {
  return `            <transition id="${element.id}">
                <graphics>
                    <position x="${element.x}" y="${element.y}" />
                    <dimension x="${element.width}" y="${element.height}" />
                </graphics>
                <toolspecific tool="petrinet.io" version="1.0">
                    <property key="transitionType" value="empty" />
                </toolspecific>
            </transition>
`;
}


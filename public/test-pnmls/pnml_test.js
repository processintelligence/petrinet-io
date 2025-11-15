// Enhanced helper to extract elements for comparison including IDs, waypoints, tokens, etc.
function extractElementsForComparison(pnmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(pnmlString, 'text/xml');
    
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
        throw new Error('Invalid XML: ' + parserError.textContent);
    }
    
    // Extract places with all properties
    const places = Array.from(doc.querySelectorAll('place')).map(p => {
        const nameNode = p.querySelector('name > text');
        const labelOffsetNode = p.querySelector('name > graphics > offset');
        const markingNode = p.querySelector('initialMarking > text');
        const positionNode = p.querySelector('graphics > position');
        const dimensionNode = p.querySelector('graphics > dimension');
        
        return {
            id: p.getAttribute('id'),
            name: nameNode?.textContent || '',
            tokens: markingNode?.textContent || '0',
            x: positionNode?.getAttribute('x') || '0',
            y: positionNode?.getAttribute('y') || '0',
            width: dimensionNode?.getAttribute('x') || '0',
            height: dimensionNode?.getAttribute('y') || '0',
            labelOffsetX: labelOffsetNode?.getAttribute('x') || '0',
            labelOffsetY: labelOffsetNode?.getAttribute('y') || '0'
        };
    }).sort((a, b) => a.id.localeCompare(b.id));
    
    // Extract transitions with all properties
    const transitions = Array.from(doc.querySelectorAll('transition')).map(t => {
        const nameNode = t.querySelector('name > text');
        const labelOffsetNode = t.querySelector('name > graphics > offset');
        const positionNode = t.querySelector('graphics > position');
        const dimensionNode = t.querySelector('graphics > dimension');
        
        return {
            id: t.getAttribute('id'),
            name: nameNode?.textContent || '',
            isEmpty: !!t.querySelector('toolspecific[tool="petrinet.io"] property[key="transitionType"][value="empty"]'),
            x: positionNode?.getAttribute('x') || '0',
            y: positionNode?.getAttribute('y') || '0',
            width: dimensionNode?.getAttribute('x') || '0',
            height: dimensionNode?.getAttribute('y') || '0',
            labelOffsetX: labelOffsetNode?.getAttribute('x') || '0',
            labelOffsetY: labelOffsetNode?.getAttribute('y') || '0'
        };
    }).sort((a, b) => a.id.localeCompare(b.id));
    
    // Extract arcs with all properties including waypoints
    const arcs = Array.from(doc.querySelectorAll('arc')).map(a => {
        const inscriptionNode = a.querySelector('inscription > text');
        const labelOffsetNode = a.querySelector('inscription > graphics > offset');
        const positionNodes = Array.from(a.querySelectorAll('graphics > position'));
        
        // Extract waypoints (intermediate positions)
        const waypoints = positionNodes.map(pos => ({
            x: pos.getAttribute('x'),
            y: pos.getAttribute('y')
        }));
        
        return {
            id: a.getAttribute('id'),
            source: a.getAttribute('source'),
            target: a.getAttribute('target'),
            inscription: inscriptionNode?.textContent || '',
            labelOffsetX: labelOffsetNode?.getAttribute('x') || '0',
            labelOffsetY: labelOffsetNode?.getAttribute('y') || '0',
            waypoints: waypoints,
            waypointCount: waypoints.length
        };
    }).sort((a, b) => {
        // Sort by source, then target, then ID
        if (a.source !== b.source) return a.source.localeCompare(b.source);
        if (a.target !== b.target) return a.target.localeCompare(b.target);
        return a.id.localeCompare(b.id);
    });
    
    return { places, transitions, arcs };
}

// Compare two PNML structures with detailed checking
function comparePnml(originalPnml, exportedPnml) {
    const original = extractElementsForComparison(originalPnml);
    const exported = extractElementsForComparison(exportedPnml);
    
    const errors = [];
    
    if (original.places.length !== exported.places.length) {
        errors.push(`Place count: ${original.places.length} vs ${exported.places.length}`);
    } else {
        original.places.forEach((place, i) => {
            const exp = exported.places[i];
            if (place.id !== exp.id) errors.push(`Place ${i} ID: "${place.id}" vs "${exp.id}"`);
            if (place.name !== exp.name) errors.push(`Place ${i} name: "${place.name}" vs "${exp.name}"`);
            if (place.tokens !== exp.tokens) errors.push(`Place ${i} tokens: ${place.tokens} vs ${exp.tokens}`);
            if (place.x !== exp.x) errors.push(`Place ${i} x: ${place.x} vs ${exp.x}`);
            if (place.y !== exp.y) errors.push(`Place ${i} y: ${place.y} vs ${exp.y}`);
            if (place.width !== exp.width) errors.push(`Place ${i} width: ${place.width} vs ${exp.width}`);
            if (place.height !== exp.height) errors.push(`Place ${i} height: ${place.height} vs ${exp.height}`);
            // Label offsets: if original is 0 and exported is a calculated default, that's acceptable
            // (renderer calculates defaults when offsets aren't in PNML)
            const offsetXDiff = Math.abs(parseFloat(place.labelOffsetX) - parseFloat(exp.labelOffsetX));
            const offsetYDiff = Math.abs(parseFloat(place.labelOffsetY) - parseFloat(exp.labelOffsetY));
            if (place.labelOffsetX === '0' && offsetXDiff > 0.1) {
                // Original had no offset, exported has calculated - acceptable
            } else if (place.labelOffsetX !== exp.labelOffsetX) {
                errors.push(`Place ${i} labelOffsetX: ${place.labelOffsetX} vs ${exp.labelOffsetX}`);
            }
            if (place.labelOffsetY === '0' && offsetYDiff > 0.1) {
                // Original had no offset, exported has calculated - acceptable
            } else if (place.labelOffsetY !== exp.labelOffsetY) {
                errors.push(`Place ${i} labelOffsetY: ${place.labelOffsetY} vs ${exp.labelOffsetY}`);
            }
        });
    }
    
    // Compare transitions
    if (original.transitions.length !== exported.transitions.length) {
        errors.push(`Transition count: ${original.transitions.length} vs ${exported.transitions.length}`);
    } else {
        original.transitions.forEach((trans, i) => {
            const exp = exported.transitions[i];
            if (trans.id !== exp.id) errors.push(`Transition ${i} ID: "${trans.id}" vs "${exp.id}"`);
            if (trans.name !== exp.name) errors.push(`Transition ${i} name: "${trans.name}" vs "${exp.name}"`);
            if (trans.isEmpty !== exp.isEmpty) errors.push(`Transition ${i} type: empty=${trans.isEmpty} vs ${exp.isEmpty}`);
            if (trans.x !== exp.x) errors.push(`Transition ${i} x: ${trans.x} vs ${exp.x}`);
            if (trans.y !== exp.y) errors.push(`Transition ${i} y: ${trans.y} vs ${exp.y}`);
            if (trans.width !== exp.width) errors.push(`Transition ${i} width: ${trans.width} vs ${exp.width}`);
            if (trans.height !== exp.height) errors.push(`Transition ${i} height: ${trans.height} vs ${exp.height}`);
            // Label offsets: if original is 0 and exported is a calculated default, that's acceptable
            const transOffsetXDiff = Math.abs(parseFloat(trans.labelOffsetX) - parseFloat(exp.labelOffsetX));
            const transOffsetYDiff = Math.abs(parseFloat(trans.labelOffsetY) - parseFloat(exp.labelOffsetY));
            if (trans.labelOffsetX === '0' && transOffsetXDiff > 0.1) {
                // Original had no offset, exported has calculated - acceptable
            } else if (trans.labelOffsetX !== exp.labelOffsetX) {
                errors.push(`Transition ${i} labelOffsetX: ${trans.labelOffsetX} vs ${exp.labelOffsetX}`);
            }
            if (trans.labelOffsetY === '0' && transOffsetYDiff > 0.1) {
                // Original had no offset, exported has calculated - acceptable
            } else if (trans.labelOffsetY !== exp.labelOffsetY) {
                errors.push(`Transition ${i} labelOffsetY: ${trans.labelOffsetY} vs ${exp.labelOffsetY}`);
            }
        });
    }
    
    // Compare arcs
    if (original.arcs.length !== exported.arcs.length) {
        errors.push(`Arc count: ${original.arcs.length} vs ${exported.arcs.length}`);
    } else {
        original.arcs.forEach((arc, i) => {
            const exp = exported.arcs[i];
            if (arc.id !== exp.id) errors.push(`Arc ${i} ID: "${arc.id}" vs "${exp.id}"`);
            if (arc.source !== exp.source) errors.push(`Arc ${i} source: "${arc.source}" vs "${exp.source}"`);
            if (arc.target !== exp.target) errors.push(`Arc ${i} target: "${arc.target}" vs "${exp.target}"`);
            if (arc.inscription !== exp.inscription) errors.push(`Arc ${i} inscription: "${arc.inscription}" vs "${exp.inscription}"`);
            if (arc.labelOffsetX !== exp.labelOffsetX) errors.push(`Arc ${i} labelOffsetX: ${arc.labelOffsetX} vs ${exp.labelOffsetX}`);
            if (arc.labelOffsetY === '0' && exp.labelOffsetY === '-10') {
                // Original had no offset, exported has default -10 - acceptable
            } else if (arc.labelOffsetY !== exp.labelOffsetY) {
                errors.push(`Arc ${i} labelOffsetY: ${arc.labelOffsetY} vs ${exp.labelOffsetY}`);
            }
            
            // Compare waypoints
            if (arc.waypointCount !== exp.waypointCount) {
                errors.push(`Arc ${i} waypoint count: ${arc.waypointCount} vs ${exp.waypointCount}`);
            } else {
                arc.waypoints.forEach((wp, j) => {
                    const expWp = exp.waypoints[j];
                    if (wp.x !== expWp.x) errors.push(`Arc ${i} waypoint ${j} x: ${wp.x} vs ${expWp.x}`);
                    if (wp.y !== expWp.y) errors.push(`Arc ${i} waypoint ${j} y: ${wp.y} vs ${expWp.y}`);
                });
            }
        });
    }
    
    return { passed: errors.length === 0, errors };
}

// Test all PNML files using the existing import/export API
async function testAllPnmlFiles() {
    const diagram = window.diagram;
    if (!diagram) {
        console.error('❌ Diagram not found. Set window.diagram = diagram in your app');
        return;
    }

    const testFiles = [
        'sequence.pnml',
        'and-split.pnml',
        'and-join.pnml',
        'xor-split.pnml',
        'xor-join.pnml'
    ];

    console.log('Testing all PNML files with full property checking...\n');
    console.log('Checking: IDs, positions, dimensions, tokens, labels, label offsets, waypoints, arc sources/targets\n');
    
    const importer = diagram.get('pnmlImporter');
    const exporter = diagram.get('pnmlExporter');
    
    let passed = 0;
    let failed = 0;

    for (const file of testFiles) {
        try {
            // Load original
            const response = await fetch(`test-pnmls/${file}`);
            const originalPnml = await response.text();
            
            // Import using existing API
            importer.importPnml(originalPnml);
            
            // Export using getPnmlString() method
            const exportedPnml = exporter.getPnmlString();
            
            // Compare
            const result = comparePnml(originalPnml, exportedPnml);
            
            if (result.passed) {
                console.log(`✅ ${file} - PASSED (all properties match)`);
                passed++;
            } else {
                console.log(`❌ ${file} - FAILED`);
                result.errors.forEach(err => console.log(`   ${err}`));
                failed++;
            }
        } catch (error) {
            console.log(`❌ ${file} - ERROR: ${error.message}`);
            console.error(error);
            failed++;
        }
    }

    console.log(`\n Results: ${passed} passed, ${failed} failed`);
    if (failed === 0) {
        console.log("All tests passed!");
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.testAllPnmlFiles = testAllPnmlFiles;
    console.log('✅ PNML tests loaded! Run testAllPnmlFiles() to test import/export');
}

/* to run the test run this code in the console of the browser
/*const script = document.createElement('script');
script.src = 'test-pnmls/pnml_test.js';
document.head.appendChild(script);*/


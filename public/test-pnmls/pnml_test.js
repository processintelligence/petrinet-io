// Helper to extract elements for comparison (ignoring IDs which may change)
function extractElementsForComparison(pnmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(pnmlString, 'text/xml');
    
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
        throw new Error('Invalid XML: ' + parserError.textContent);
    }
    
    const places = Array.from(doc.querySelectorAll('place')).map(p => ({
        name: p.querySelector('name > text')?.textContent || '',
        tokens: p.querySelector('initialMarking > text')?.textContent || '0',
        x: p.querySelector('graphics > position')?.getAttribute('x') || '0',
        y: p.querySelector('graphics > position')?.getAttribute('y') || '0',
        width: p.querySelector('graphics > dimension')?.getAttribute('x') || '0',
        height: p.querySelector('graphics > dimension')?.getAttribute('y') || '0'
    })).sort((a, b) => `${a.x}-${a.y}`.localeCompare(`${b.x}-${b.y}`));
    
    const transitions = Array.from(doc.querySelectorAll('transition')).map(t => ({
        name: t.querySelector('name > text')?.textContent || '',
        isEmpty: !!t.querySelector('toolspecific[tool="petrinet.io"] property[key="transitionType"][value="empty"]'),
        x: t.querySelector('graphics > position')?.getAttribute('x') || '0',
        y: t.querySelector('graphics > position')?.getAttribute('y') || '0',
        width: t.querySelector('graphics > dimension')?.getAttribute('x') || '0',
        height: t.querySelector('graphics > dimension')?.getAttribute('y') || '0'
    })).sort((a, b) => `${a.x}-${a.y}`.localeCompare(`${b.x}-${b.y}`));
    
    const arcs = Array.from(doc.querySelectorAll('arc')).map(a => {
        const positions = Array.from(a.querySelectorAll('graphics > position'));
        return {
            inscription: a.querySelector('inscription > text')?.textContent || '',
            waypointCount: positions.length
        };
    }).sort((a, b) => a.inscription.localeCompare(b.inscription));
    
    return { places, transitions, arcs };
}

// Compare two PNML structures
function comparePnml(originalPnml, exportedPnml) {
    const original = extractElementsForComparison(originalPnml);
    const exported = extractElementsForComparison(exportedPnml);
    
    const errors = [];
    
    if (original.places.length !== exported.places.length) {
        errors.push(`Place count: ${original.places.length} vs ${exported.places.length}`);
    } else {
        original.places.forEach((place, i) => {
            const exp = exported.places[i];
            if (place.name !== exp.name) errors.push(`Place ${i} name: "${place.name}" vs "${exp.name}"`);
            if (place.tokens !== exp.tokens) errors.push(`Place ${i} tokens: ${place.tokens} vs ${exp.tokens}`);
            if (place.x !== exp.x || place.y !== exp.y) errors.push(`Place ${i} position: (${place.x},${place.y}) vs (${exp.x},${exp.y})`);
        });
    }
    
    if (original.transitions.length !== exported.transitions.length) {
        errors.push(`Transition count: ${original.transitions.length} vs ${exported.transitions.length}`);
    } else {
        original.transitions.forEach((trans, i) => {
            const exp = exported.transitions[i];
            if (trans.name !== exp.name) errors.push(`Transition ${i} name: "${trans.name}" vs "${exp.name}"`);
            if (trans.isEmpty !== exp.isEmpty) errors.push(`Transition ${i} type: empty=${trans.isEmpty} vs ${exp.isEmpty}`);
        });
    }
    
    if (original.arcs.length !== exported.arcs.length) {
        errors.push(`Arc count: ${original.arcs.length} vs ${exported.arcs.length}`);
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

    console.log('Testing all PNML files...\n');
    
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
                console.log(`✅ ${file} - PASSED`);
                passed++;
            } else {
                console.log(`❌ ${file} - FAILED`);
                result.errors.forEach(err => console.log(`   ${err}`));
                failed++;
            }
        } catch (error) {
            console.log(`❌ ${file} - ERROR: ${error.message}`);
            failed++;
        }
    }

    console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
}

// Make available globally
if (typeof window !== 'undefined') {
    window.testAllPnmlFiles = testAllPnmlFiles;
    console.log('✅ Test loaded! Run testAllPnmlFiles() to test all files');
}

/*const script = document.createElement('script');
script.src = 'test-pnmls/pnml_test.js';
document.head.appendChild(script);*/

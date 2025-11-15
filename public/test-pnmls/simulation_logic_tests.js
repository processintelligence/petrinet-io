// Prevent redeclaration if script is loaded multiple times
if (typeof window !== 'undefined' && window.testSimulationLogic) {
    console.log('Simulation tests already loaded');
} else {
    const tests = [{
        name: "Sequence",
        fired: "A",
        tokens: {p1: 0, p2: 1, p3: 0},
        transitions_that_can_fire: ["B"]
    },
    {
        name: "And Split",
        fired: "A",
        tokens: {p1: 0, p2: 1, p3: 1},
        transitions_that_can_fire: ["B", "C"]
    },
    {
        name: "And Join",
        fired: "A",
        tokens: {p1: 0, p2: 1, p3: 1, p4: 0},
        transitions_that_can_fire: ["B"]
    },
    {
        name: "Xor Split",
        fired: "A",
        tokens: {p1: 0, p2: 1},
        transitions_that_can_fire: ["B", "C"]
    }, 
    {
        name: "Xor Join",
        fired: "A",
        tokens: {p1: 0, p2: 1, p3: 1},
        transitions_that_can_fire: ["B", "C"]
    }];

    // Test simulation firing logic
    async function testSimulationLogic() {
    const diagram = window.diagram;
    if (!diagram) {
        console.error('❌ Diagram not found. Set window.diagram = diagram in your app');
        return;
    }

    const simulation = diagram.get('simulationService');
    const importer = diagram.get('pnmlImporter');
    const elementRegistry = diagram.get('elementRegistry');
    
    const testFiles = [
        'sequence.pnml',
        'and-split.pnml',
        'and-join.pnml',
        'xor-split.pnml',
        'xor-join.pnml'
    ];

    console.log('Testing simulation firing logic...\n');

    for (let i = 0; i < testFiles.length; i++) {
        const file = testFiles[i];
        const test = tests[i];
        
        try {
            // 1. Load and import PNML
            const response = await fetch(`test-pnmls/${file}`);
            const originalPnml = await response.text();
            importer.importPnml(originalPnml);
            
            // 2. Activate simulation (required before firing)
            simulation.toggleSimulation();
            
            // 3. Find the transition to fire by name (not place!)
            const allElements = elementRegistry.getAll();
            const transitionToFire = allElements.find(el => 
                (el.type === "petri:transition" || el.type === "petri:empty_transition") 
                && el.businessObject?.name === test.fired
            );
            
            if (!transitionToFire) {
                console.log(`❌ ${test.name}: Could not find transition "${test.fired}"`);
                continue;
            }
            
            // 4. Fire the transition
            simulation.fireTransition(transitionToFire);
            
            // 5. Get all places and check token states
            const places = allElements.filter(el => el.type === "petri:place");
            const actualTokens = {};
            places.forEach(place => {
                actualTokens[place.id] = place.businessObject?.tokens || 0;
            });
            
            // 6. Get enabled transitions after firing
            const enabledTransitions = allElements
                .filter(el => (el.type === "petri:transition" || el.type === "petri:empty_transition")
                    && simulation.isTransitionEnabled(el))
                .map(el => el.businessObject?.name || el.id);
            
            // 7. Compare with expected results
            let errors = [];
            
            // Check token states
            Object.keys(test.tokens).forEach(placeId => {
                const expected = test.tokens[placeId];
                const actual = actualTokens[placeId];
                if (expected !== actual) {
                    errors.push(`Place ${placeId}: expected ${expected} tokens, got ${actual}`);
                }
            });
            
            // Check enabled transitions (compare names)
            const expectedEnabled = test.transitions_that_can_fire.sort();
            const actualEnabled = enabledTransitions.sort();
            
            if (JSON.stringify(expectedEnabled) !== JSON.stringify(actualEnabled)) {
                errors.push(`Enabled transitions: expected [${expectedEnabled.join(', ')}], got [${actualEnabled.join(', ')}]`);
            }
            
            // Report results
            if (errors.length === 0) {
                console.log(`✅ ${test.name} - PASSED`);
            } else {
                console.log(`❌ ${test.name} - FAILED`);
                errors.forEach(err => console.log(`   ${err}`));
            }
            
            // Clean up for next test
            simulation.toggleSimulation(); // Turn off
            
        } catch (error) {
            console.log(`❌ ${test.name}: ERROR - ${error.message}`);
        }
    }
    }

    // Make available globally
    if (typeof window !== 'undefined') {
        window.testSimulationLogic = testSimulationLogic;
        console.log('✅ Simulation tests loaded! Run testSimulationLogic() to test firing logic');
    }
}



/*const script = document.createElement('script');
script.src = 'test-pnmls/simulation_logic_tests.js'; 
document.head.appendChild(script);*/
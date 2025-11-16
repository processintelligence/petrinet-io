
// (1) create new editor instance

const diagram = new Editor({
    container: document.querySelector('#container')
});

window.diagram = diagram;  // Add this line to expose diagram for testing

const injector = diagram.get('injector');
    const services = Object.keys(injector._providers || {}).sort();
    console.log('[diagram-js] Available services (injectables):', services);

  
  
  // (2) draw diagram elements (i.e. import)
  
  const canvas = diagram.get('canvas');
  const elementFactory = diagram.get('elementFactory');
  const importer = diagram.get('pnmlImporter');
  // add root
  const root = elementFactory.createRoot();
  
  canvas.setRootElement(root);
  
  initialPagePNML = `<?xml version="1.0" encoding="UTF-8"?>
  <pnml>
      <net id="ptnet1" type="http://www.pnml.org/version-2009/grammar/ptnet">
          <page id="top-level">
              <place id="p1">
                  <graphics>
                      <position x="347" y="54" />
                      <dimension x="50" y="50" />
                  </graphics>
                  <name>
                      <text>to the</text>
                      <graphics>
                          <offset x="21.677669529663685" y="21.677669529663685" />
                      </graphics>
                  </name>
                  <initialMarking>
                      <text>3</text>
                  </initialMarking>
              </place>
              <transition id="t1">
                  <graphics>
                      <position x="199" y="43" />
                      <dimension x="70" y="70" />
                  </graphics>
                  <name>
                      <text>Hi!
  Welcome</text>
                      <graphics>
                          <offset x="0" y="0" />
                      </graphics>
                  </name>
              </transition>
              <transition id="t2">
                  <graphics>
                      <position x="475" y="44" />
                      <dimension x="70" y="70" />
                  </graphics>
                  <name>
                      <text>Petri
  Net 
  Editor</text>
                      <graphics>
                          <offset x="0" y="0" />
                      </graphics>
                  </name>
              </transition>
              <arc id="connection_26" source="t1" target="p1">
              </arc>
              <arc id="connection_27" source="p1" target="t2">
              </arc>
          </page>
      </net>
  </pnml>`

  initialPage = importer.importPnml(initialPagePNML)
  

  // (3) interact with the diagram via API
  
  const selection = diagram.get('selection');
2

  // (4) Setup SVG Export button
  
  const svgExporter = diagram.get('svgExporter');
  const exportButton = document.getElementById('export-button');
  
  if (exportButton && svgExporter) {
    exportButton.addEventListener('click', () => {
      svgExporter.exportSvg('petri-net.svg')
        .then(result => {
          console.log('SVG exported successfully');
        })
        .catch(error => {
          console.error('SVG export failed:', error);
        });
    });
  }

  // (5) Setup PNML Export button
  
  const pnmlExporter = diagram.get('pnmlExporter');
  const pnmlExportButton = document.getElementById('export-pnml-button');
  
  if (pnmlExportButton && pnmlExporter) {
    pnmlExportButton.addEventListener('click', () => {
      pnmlExporter.exportPnml('petri-net.pnml');
    });
  }

  // (6) Setup PNML Import button
  
  const pnmlImporter = diagram.get('pnmlImporter');
  const pnmlImportButton = document.getElementById('import-pnml-button');
  
  if (pnmlImportButton && pnmlImporter) {
    pnmlImportButton.addEventListener('click', () => {
      pnmlImporter.defaultPnml = false;
      pnmlImporter.loadFromFile();
    });
  }


  const pnmlDefaultImporter = diagram.get('pnmlImporter');
  const pnmlDefaultImportButton = document.getElementById('import-pnml-default-button');
  
  if (pnmlDefaultImportButton && pnmlDefaultImporter) {
    pnmlDefaultImportButton.addEventListener('click', () => {
      pnmlDefaultImporter.defaultPnml = true;
      pnmlDefaultImporter.loadFromFile();
    });
  }
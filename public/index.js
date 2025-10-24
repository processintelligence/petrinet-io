/* global Editor */


// (1) create new editor instance

const diagram = new Editor({
    container: document.querySelector('#container')
  });
  
    const injector = diagram.get('injector');
    const services = Object.keys(injector._providers || {}).sort();
    console.log('[diagram-js] Available services (injectables):', services);

  
  
  // (2) draw diagram elements (i.e. import)
  
  const canvas = diagram.get('canvas');
  const elementFactory = diagram.get('elementFactory');
  
  // add root
  const root = elementFactory.createRoot();
  
  canvas.setRootElement(root);
  
  // add shapes
  const shape1 = elementFactory.createShape({
    type: 'petri:place',
    x: 150,
    y: 100,
    width: 100,
    height: 80,
    businessObject: {
      tokens: 2
    }
  });
  
  canvas.addShape(shape1, root);
  
  const shape2 = elementFactory.createShape({
    type: 'petri:transition',
    x: 290,
    y: 220,
    width: 100,
    height: 80
  });
  
  canvas.addShape(shape2, root);
  
  
  const connection1 = elementFactory.createConnection({
    type: 'petri:connection',
    waypoints: [
      { x: 250, y: 180 },
      { x: 290, y: 220 }
    ],
    source: shape1,
    target: shape2
  });
  
  canvas.addConnection(connection1, root);
  
  
  const shape3 = elementFactory.createShape({
    type: 'petri:place',
    x: 450,
    y: 80,
    width: 100,
    height: 80,
    businessObject: {
      tokens: 0
    }
  });
  
  canvas.addShape(shape3, root);

  
  
  // (3) interact with the diagram via API
  
  const selection = diagram.get('selection');
  
  selection.select(shape3);


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
      pnmlImporter.loadFromFile();
    });
  }
import PetriNetIO from '../lib/index';

const petrinetio = new PetriNetIO({
  container: '#container'
});

function onClick(id, handler) {
  const element = document.getElementById(id);

  if (element) {
    element.addEventListener('click', handler);
  }
}

async function loadFixture(fileName, layoutAlgorithm = null) {
  const response = await fetch(`test-pnmls/${ fileName }`);

  if (!response.ok) {
    throw new Error(`Failed to load fixture "${ fileName }": ${ response.status }`);
  }

  const pnml = await response.text();
  petrinetio.importPNML(pnml);

  if (layoutAlgorithm) {
    petrinetio.runAutoLayout(layoutAlgorithm);
  }

  requestAnimationFrame(() => {
    petrinetio.getCanvas().zoom('fit-viewport');
  });
}


onClick('js-open-pnml', () => {
  petrinetio.loadFromFile();
});

onClick('js-download-pnml', () => {
  petrinetio.exportPNML();
});

onClick('js-download-tpn', () => {
  petrinetio.exportTpn();
});

onClick('js-download-svg', () => {
  petrinetio.exportSVG();
});

onClick('js-download-pdf', () => {
  petrinetio.exportPDF();
});

onClick('js-auto-layout-sugiyama', () => {
  petrinetio.runAutoLayout('sugiyama');
});

onClick('js-auto-layout-auto', () => {
  petrinetio.runAutoLayout('auto');
});

onClick('js-auto-layout-circular', () => {
  petrinetio.runAutoLayout('circular');
});

onClick('js-auto-layout-force-directed', () => {
  petrinetio.runAutoLayout('force-directed');
});

onClick('js-preview-auto-structures', () => {
  petrinetio.previewAutoLayoutStructures();
});

onClick('js-load-melanoma-treatment', async () => {
  try {
    await loadFixture('Melanoma_Treatment.pnml');
  } catch (error) {
    console.error(error);
  }
});

onClick('js-load-model-23', async () => {
  try {
    await loadFixture('model (23).pnml');
  } catch (error) {
    console.error(error);
  }
});

onClick('js-load-spotify-cares', async () => {
  try {
    await loadFixture('Spotify_Cares.pnml');
  } catch (error) {
    console.error(error);
  }
});

onClick('js-load-detection-mixed', async () => {
  try {
    await loadFixture('detection-mixed-structures.pnml');
  } catch (error) {
    console.error(error);
  }
});

onClick('js-load-detection-six-split', async () => {
  try {
    await loadFixture('detection-six-split.pnml');
  } catch (error) {
    console.error(error);
  }
});

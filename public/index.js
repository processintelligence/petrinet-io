import PetriNetIO from '../lib/index';

const petrinetio = new PetriNetIO({
  container: '#container'
});

async function loadFixture(fileName) {
  const response = await fetch(`test-pnmls/${ fileName }`);

  if (!response.ok) {
    throw new Error(`Failed to load fixture "${ fileName }": ${ response.status }`);
  }

  const pnml = await response.text();
  petrinetio.importPNML(pnml);

  requestAnimationFrame(() => {
    petrinetio.getCanvas().zoom('fit-viewport');
  });
}


document.getElementById('js-open-pnml').addEventListener('click', () => {
  petrinetio.loadFromFile();
});

document.getElementById('js-download-pnml').addEventListener('click', () => {
  petrinetio.exportPNML();
});

document.getElementById('js-download-tpn').addEventListener('click', () => {
  petrinetio.exportTpn();
});

document.getElementById('js-download-svg').addEventListener('click', () => {
  petrinetio.exportSVG();
});

document.getElementById('js-download-pdf').addEventListener('click', () => {
  petrinetio.exportPDF();
});

document.getElementById('js-auto-layout-sugiyama').addEventListener('click', () => {
  petrinetio.runAutoLayout('sugiyama');
});

document.getElementById('js-auto-layout-circular').addEventListener('click', () => {
  petrinetio.runAutoLayout('circular');
});

document.getElementById('js-load-melanoma-treatment').addEventListener('click', async () => {
  try {
    await loadFixture('Melanoma_Treatment.pnml');
  } catch (error) {
    console.error(error);
  }
});

document.getElementById('js-load-model-23').addEventListener('click', async () => {
  try {
    await loadFixture('model (23).pnml');
  } catch (error) {
    console.error(error);
  }
});

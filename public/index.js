import PetriNetIO from '../lib/index'; // or from 'petrinet-io' after install

const petrinetio = new PetriNetIO({
  container: '#container'
});


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

document.getElementById('js-properties').addEventListener('click', () => {
  console.log(petrinetio.getPetriNet());
});

document.getElementById('js-sugiyama').addEventListener('click', () => {
  petrinetio.runAutoLayout('sugiyama');
});

document.getElementById('js-circular').addEventListener('click', () => {
  petrinetio.runAutoLayout('circular');
});

document.getElementById('js-force').addEventListener('click', () => {
  petrinetio.runAutoLayout('force-directed');
});

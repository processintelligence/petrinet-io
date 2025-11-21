import "../lib/assets/petrinet-io.css";
import PetriNetIO from '../lib/PetriNetIO'; // or from 'petrinet-io' after install

const petrinetio = new PetriNetIO({
  container: '#container'
});


document.getElementById('js-open-pnml').addEventListener('click', () => {
  petrinetio.loadFromFile();
});

document.getElementById('js-download-pnml').addEventListener('click', () => {
  petrinetio.exportPNML();
});

document.getElementById('js-download-svg').addEventListener('click', () => {
  petrinetio.exportSVG();
});

document.getElementById('js-download-tpn').addEventListener('click', () => {
  petrinetio.exportTpn();
});
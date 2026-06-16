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

document.getElementById('js-resize-places').addEventListener('click', () => {
  const size = promptForElementSize('places');
  if (!size) {
    return;
  }
  petrinetio.resizePlaces(size);
});

document.getElementById('js-resize-transitions').addEventListener('click', () => {
  const size = promptForElementSize('transitions');
  if (!size) {
    return;
  }
  petrinetio.resizeTransitions(size);
});

function promptForElementSize(elementLabel) {
  let value = 40;
  if (elementLabel == 'transitions') {
    value = window.prompt(`Enter size for all ${elementLabel} (for example 40 or 80x40):`, '40');
  } else {
    value = window.prompt(`Enter size for all ${elementLabel} (for example 30):`, '30');
  }
  if (!value) {
    return null;
  }
  const parts = value.trim().toLowerCase().split(/[x, ]+/).filter(Boolean);
  if (parts.length < 1 || parts.length > 2) {
    window.alert('Enter a size like 50 or 50x70.');
    return null;
  }
  let width = Number(parts[0]);
  let height = Number(parts[1] || parts[0]);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    window.alert('Width and height must be positive numbers.');
    return null;
  }

  if (elementLabel == 'places') {
    height = width;
  }
  return {width, height};
}

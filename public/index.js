import PetriNetIO from '../lib/index'; // or from 'petrinet-io' after install

const petrinetio = new PetriNetIO({
  container: '#container'
});

window.petrinetio = petrinetio;
window.dispatchEvent(new CustomEvent('petrinetio:ready', {
  detail: { petrinetio }
}));

bindAction('js-open-pnml', () => petrinetio.loadFromFile());

bindAction('js-download-pnml', () => petrinetio.exportPNML());

bindAction('js-download-tpn', () => petrinetio.exportTpn());

bindAction('js-download-svg', () => petrinetio.exportSVG());

bindAction('js-download-pdf', () => petrinetio.exportPDF());

bindAction('js-properties', () => console.log(petrinetio.getPetriNet()));

bindAction('js-sugiyama', () => petrinetio.runAutoLayout('sugiyama'));

bindAction('js-circular', () => petrinetio.runAutoLayout('circular'));

bindAction('js-force', () => petrinetio.runAutoLayout('force-directed'));

bindAction('js-resize-places', () => {
  const size = promptForElementSize('places');
  if (!size) {
    return;
  }
  petrinetio.resizePlaces(size);
});

bindAction('js-resize-transitions', () => {
  const size = promptForElementSize('transitions');
  if (!size) {
    return;
  }
  petrinetio.resizeTransitions(size);
});

function bindAction(id, action) {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }

  element.addEventListener('click', () => {
    action();
    window.dispatchEvent(new CustomEvent('petrinetio:model-action', {
      detail: { id }
    }));
  });
}

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

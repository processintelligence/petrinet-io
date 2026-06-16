import UpdateColorsHandler from './UpdateColorsHandler.js';

const colorImageSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor">
  <path d="m12.5 5.5.3-.4 3.6-3.6c.5-.5 1.3-.5 1.7 0l1 1c.5.4.5 1.2 0 1.7l-3.6 3.6-.4.2v.2c0 1.4.6 2 1 2.7v.6l-1.7 1.6c-.2.2-.4.2-.6 0L7.3 6.6a.4.4 0 0 1 0-.6l.3-.3.5-.5.8-.8c.2-.2.4-.1.6 0 .9.5 1.5 1.1 3 1.1zm-9.9 6 4.2-4.2 6.3 6.3-4.2 4.2c-.3.3-.9.3-1.2 0l-.8-.8-.9-.8-2.3-2.9" />
</svg>`;

const COLOR_COMMAND = 'element.updateColors';

const FILL_COLORS = [
  '#ffffff',
  '#fff2cc',
  '#d5e8d4',
  '#dae8fc',
  '#f8cecc',
  '#e1d5e7'
];

const STROKE_COLORS = [
  '#000000',
  '#d79b00',
  '#82b366',
  '#6c8ebf',
  '#b85450',
  '#9673a6'
];

export default class ColorPickerProvider {
  static $inject = [
    'canvas',
    'commandStack',
    'contextPad',
    'simulationService',
  ];

  constructor(canvas, commandStack, contextPad, simulationService) {
    this.canvas = canvas;
    this.commandStack = commandStack;
    this._popup = null;
    this.simulationService = simulationService;

    commandStack.registerHandler(COLOR_COMMAND, UpdateColorsHandler);
    contextPad.registerProvider(this);
  }

  getContextPadEntries(element) {
    if (this.simulationService.isActive || !isColorable(element)) {
      return {};
    }

    return {
      color: {
        group: 'edit',
        className: 'petri-color-brush',
        title: 'Change colors',
        html: `<div class="entry">${colorImageSvg}</div>`,
        action: {
          click: (event) => this.open(element, event)
        }
      }
    };
  }

  open(element, event) {
    this.close();

    const container = this.canvas.getContainer();
    const popup = this._popup = document.createElement('div');

    popup.className = 'pnjs-color-picker';
    popup.addEventListener('mousedown', event => event.stopPropagation());
    popup.addEventListener('click', event => event.stopPropagation());

    popup.appendChild(this._createColorRow('Fill', 'fill', FILL_COLORS, element));
    popup.appendChild(this._createColorRow('Border', 'stroke', STROKE_COLORS, element));
    popup.appendChild(this._createResetButton(element));

    container.appendChild(popup);

    const x = event.clientX || event.x || 0;
    const y = event.clientY || event.y || 0;

    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;

    setTimeout(() => {
      const close = closeEvent => {
        if (!popup.contains(closeEvent.target)) {
          this.close();
          document.removeEventListener('mousedown', close, true);
        }
      };

      document.addEventListener('mousedown', close, true);
    });
  }

  close() {
    if (this._popup) {
      this._popup.remove();
      this._popup = null;
    }
  }

  _createColorRow(label, colorType, colors, element) {
    const row = document.createElement('div');
    row.className = 'pnjs-color-picker-row';

    const labelNode = document.createElement('span');
    labelNode.className = 'pnjs-color-picker-label';
    labelNode.textContent = label;
    row.appendChild(labelNode);

    colors.forEach(color => {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'pnjs-color-swatch';
      swatch.title = color;
      swatch.setAttribute('aria-label', `${label} ${color}`);
      swatch.style.backgroundColor = color;
      swatch.addEventListener('click', () => this._updateColor(element, colorType, color));
      row.appendChild(swatch);
    });

    const input = document.createElement('input');
    input.type = 'color';
    input.className = 'pnjs-color-input';
    input.title = `Custom ${label.toLowerCase()}`;
    input.value = getElementColors(element)[colorType] || (colorType === 'fill' ? '#ffffff' : '#000000');
    input.addEventListener('input', () => this._updateColor(element, colorType, input.value));
    row.appendChild(input);

    return row;
  }

  _createResetButton(element) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pnjs-color-reset';
    button.textContent = 'Reset';
    button.addEventListener('click', () => {
      this.commandStack.execute(COLOR_COMMAND, {
        element,
        colors: {}
      });
    });

    return button;
  }

  _updateColor(element, colorType, color) {
    this.commandStack.execute(COLOR_COMMAND, {
      element,
      colors: {
        ...getElementColors(element),
        [colorType]: color
      }
    });
  }
}

function isColorable(element) {
  return element.type === 'petri:place' ||
    element.type === 'petri:transition' ||
    element.type === 'petri:empty_transition';
}

function getElementColors(element) {
  return {
    ...(element.businessObject && element.businessObject.colors)
  };
}

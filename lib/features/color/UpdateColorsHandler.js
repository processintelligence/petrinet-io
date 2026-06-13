export default class UpdateColorsHandler {
  execute(context) {
    const { element, colors } = context;

    context.oldColors = getColors(element);
    setColors(element, colors);

    return element;
  }

  revert(context) {
    const { element, oldColors } = context;

    setColors(element, oldColors);

    return element;
  }
}

function getColors(element) {
  return {
    ...(element.businessObject && element.businessObject.colors)
  };
}

function setColors(element, colors = {}) {
  if (!element.businessObject) {
    element.businessObject = {};
  }

  const nextColors = {};

  if (colors.fill) {
    nextColors.fill = colors.fill;
  }

  if (colors.stroke) {
    nextColors.stroke = colors.stroke;
  }

  if (Object.keys(nextColors).length) {
    element.businessObject.colors = nextColors;
  } else {
    delete element.businessObject.colors;
  }
}

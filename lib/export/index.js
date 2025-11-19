import SvgExporter from "./SvgExporter.js";
import PnmlExporter from "./PnmlExporter.js";
import PnmlImporter from "./PnmlImporter.js";

export default {
    __init__: ['svgExporter', 'pnmlExporter', 'pnmlImporter'],
    svgExporter: ['type', SvgExporter],
    pnmlExporter: ['type', PnmlExporter],
    pnmlImporter: ['type', PnmlImporter]
};


import PnmlExporter from "./PnmlExporter.js";
import PnmlImporter from "./PnmlImporter.js";

export default {
    __init__: ['pnmlExporter', 'pnmlImporter'],
    pnmlExporter: ['type', PnmlExporter],
    pnmlImporter: ['type', PnmlImporter]
};


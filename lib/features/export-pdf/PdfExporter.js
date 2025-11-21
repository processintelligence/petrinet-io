import { jsPDF } from 'jspdf'
import 'svg2pdf.js'


export default class PdfExporter {

    static $inject = ["canvas", "elementRegistry", "svgExporter"];

    constructor(canvas, elementRegistry, svgExporter) {
        this.canvas = canvas;
        this.elementRegistry = elementRegistry;
        this.svgExporter = svgExporter;
    }

    exportPdf(filename = 'petri-net.pdf', options = {}) {
        const svgString = this.svgExporter.buildSVGString();
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
        const svgElement = svgDoc.documentElement; // <svg ...>

        let width = parseFloat(svgElement.getAttribute('width')) || 800;
        let height = parseFloat(svgElement.getAttribute('height')) || 600;
        const orientation = width > height ? 'l' : 'p';
        const doc = new jsPDF({
            orientation,
            unit: 'pt',
            format: [width, height]
        });
        const x = 0;
        const y = 0;

        return doc.svg(svgElement, {
                x,
                y,
                width,
                height
            })
            .then(() => {
                doc.save(filename);
                return { pdf: doc };
            });
    }
}


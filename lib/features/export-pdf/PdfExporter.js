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
        
        this.svgExporter.
    }

}


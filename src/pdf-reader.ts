import * as pdfjsLib from 'pdfjs-dist'
//@ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const SCALE = 2
const OUTPUT_SCALE = { sx: window.devicePixelRatio || 1, sy: window.devicePixelRatio || 1 }
const CANVAS: HTMLCanvasElement = document.getElementById('the-canvas') as HTMLCanvasElement;
const CONTEXT = CANVAS.getContext('2d') as CanvasRenderingContext2D


const loadingTask = pdfjsLib.getDocument('../test-pdf.pdf')

loadingTask.promise
  .then(async (pdf) => pdf.getPage(1))
  .then(async function (page) {
    let viewport = page.getViewport({ scale: SCALE });

    // Canvas resolution (backing store) at device pixels
    CANVAS.width = Math.round(viewport.width * OUTPUT_SCALE.sx);
    CANVAS.height = Math.round(viewport.height * OUTPUT_SCALE.sy);

    // IMPORTANT: CSS size = logical / CSS pixels (what text layer uses!)
    const cssWidth = Math.floor(viewport.width);
    const cssHeight = Math.floor(viewport.height);
    CANVAS.style.width = `${cssWidth}px`;
    CANVAS.style.height = `${cssHeight}px`;

    await page.render({
      canvasContext: CONTEXT,
      viewport: viewport,
    }).promise;

    // Text layer setup
    const textLayerDiv = document.querySelector('#text-layer') as HTMLDivElement
    textLayerDiv.innerHTML = '';

    textLayerDiv.style.setProperty('--scale-factor', viewport.scale.toString());

    // Position & size MUST match canvas CSS pixels exactly
    textLayerDiv.style.position = 'absolute';
    textLayerDiv.style.left = `${CANVAS.offsetLeft}px`;
    textLayerDiv.style.top = `${CANVAS.offsetTop}px`;
    textLayerDiv.style.width = `${cssWidth}px`;
    textLayerDiv.style.height = `${cssHeight}px`;

    // Optional: force pointer events & selection
    textLayerDiv.style.pointerEvents = 'all';
    textLayerDiv.style.userSelect = 'text';

    const textLayer = new pdfjsLib.TextLayer({
      textContentSource: page.streamTextContent(),
      container: textLayerDiv,
      viewport: viewport,
    });

    await textLayer.render();
  })

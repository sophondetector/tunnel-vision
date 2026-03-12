import * as pdfjsLib from 'pdfjs-dist'
//@ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { initializeTV } from './initialize-tv';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// NOTE: use web path to make work with npm run build
// or use relative path if just working with npm run dev

// const PDF_PATH = '../test-stuff/test-pdf.pdf'
const PDF_PATH = 'https://nathanielhtaylor.com/pdf-version.pdf'
const SCALE = 2
// TODO FIXME: sometimes have to force sx/sy to be 1 to work - have no idea why
// const OUTPUT_SCALE = { sx: window.devicePixelRatio || 1, sy: window.devicePixelRatio || 1 }
const OUTPUT_SCALE = { sx: 1, sy: 1 }
const CANVAS: HTMLCanvasElement = document.getElementById('the-canvas') as HTMLCanvasElement;
const CONTEXT = CANVAS.getContext('2d') as CanvasRenderingContext2D

let RENDERING: boolean = false
let PAGE_NUM_PENDING: number = 1
let PAGE_NUM: number = 1
let PDF_DOC: null | pdfjsLib.PDFDocumentProxy = null

async function renderPage(PAGE_NUM: number): Promise<void> {
  if (PDF_DOC === null) {
    console.warn(`renderPage: PDF_DOC is null!`)
    return
  }

  const page = await PDF_DOC.getPage(PAGE_NUM)
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
  }).promise
    .then(function () {
      RENDERING = false
    })

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

  // NOTE: Grok put these here but they seem un-necessary
  // Leaving commented out for now
  // Optional: force pointer events & selection
  // textLayerDiv.style.pointerEvents = 'all';
  // textLayerDiv.style.userSelect = 'text';

  const textLayer = new pdfjsLib.TextLayer({
    textContentSource: page.streamTextContent(),
    container: textLayerDiv,
    viewport: viewport,
  });

  await textLayer.render();

  document.getElementById('page_num')!.textContent = PAGE_NUM.toString()

  //FIXME: Works at first but when you scroll to next page the screen can't turn on and when you return to the previous page the ranges are no longer sequenced correctly
  initializeTV()
}

/**
   * If another page rendering in progress, waits until the rendering is
   * finished. Otherwise, executes rendering immediately.
   */
function queueRenderPage(num: number) {
  if (RENDERING) {
    PAGE_NUM_PENDING = num;
  } else {
    renderPage(num);
  }
}

/**
 * Displays previous page.
 */
function onPrevPage() {
  if (PAGE_NUM <= 1) {
    return;
  }
  PAGE_NUM--;
  queueRenderPage(PAGE_NUM);
}
document.getElementById('prev')!.addEventListener('click', onPrevPage);

/**
 * Displays next page.
 */
function onNextPage() {
  if (PAGE_NUM >= PDF_DOC!.numPages) {
    return;
  }
  PAGE_NUM++;
  queueRenderPage(PAGE_NUM);
}
document.getElementById('next')!.addEventListener('click', onNextPage);


pdfjsLib.getDocument(PDF_PATH).promise
  .then((pdfDocProxy) => {
    PDF_DOC = pdfDocProxy
    document.getElementById('page_count')!.textContent = PDF_DOC.numPages.toString()
  })
  .then(() => renderPage(PAGE_NUM))


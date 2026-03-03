import * as pdfjsLib from 'pdfjs-dist'
//@ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const SCALE = 2
const OUTPUT_SCALE = window.devicePixelRatio || 1;
const CANVAS: HTMLCanvasElement = document.getElementById('the-canvas') as HTMLCanvasElement;
const CONTEXT = CANVAS.getContext('2d') as CanvasRenderingContext2D
// Support HiDPI-screens.
const TRANSFORM = OUTPUT_SCALE !== 1
  ? [OUTPUT_SCALE, 0, 0, OUTPUT_SCALE, 0, 0]
  : undefined;


const loadingTask = pdfjsLib.getDocument('../test-pdf.pdf')

loadingTask.promise.then(function (pdf) {
  return pdf.getPage(1)
})
  .then(function (page) {
    const viewport = page.getViewport({ scale: SCALE, });

    CANVAS.width = Math.floor(viewport.width * OUTPUT_SCALE);
    CANVAS.height = Math.floor(viewport.height * OUTPUT_SCALE);
    CANVAS.style.width = Math.floor(viewport.width) + "px";
    CANVAS.style.height = Math.floor(viewport.height) + "px";

    page.render({
      canvasContext: CONTEXT,
      transform: TRANSFORM,
      viewport: viewport
    })

  })
  .then(() => console.log('done'))

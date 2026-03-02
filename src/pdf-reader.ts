import * as pdfjsLib from 'pdfjs-dist'
//@ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

var loadingTask = pdfjsLib.getDocument('../test-pdf.pdf')

loadingTask.promise.then(function (pdf) {
  return pdf.getPage(1)
})
  .then(function (page) {
    var scale = 2;
    var viewport = page.getViewport({ scale: scale, });
    // Support HiDPI-screens.
    var outputScale = window.devicePixelRatio || 1;

    var canvas: HTMLCanvasElement = document.getElementById('the-canvas') as HTMLCanvasElement;
    var context = canvas.getContext('2d');

    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = Math.floor(viewport.width) + "px";
    canvas.style.height = Math.floor(viewport.height) + "px";

    var transform = outputScale !== 1
      ? [outputScale, 0, 0, outputScale, 0, 0]
      : null;

    var renderContext = {
      canvasContext: context,
      transform: transform,
      viewport: viewport
    };
    //@ts-ignore
    page.render(renderContext);
  })
  .then(() => console.log('done'))

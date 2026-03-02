import * as pdfjsLib from 'pdfjs-dist'
//@ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

var text = ''
var loadingTask = pdfjsLib.getDocument('../test-pdf.pdf')

loadingTask.promise.then((pdf) => pdf.getPage(1))
  .then((page) => page.getTextContent())
  .then((tc) => {
    for (const ite of tc.items) {
      //@ts-ignore
      text += ite.str + '\n'
    }
  })
  .then(() => {
    document.querySelector('#readout')!.textContent = text
  })


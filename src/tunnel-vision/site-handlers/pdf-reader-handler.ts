import { TvHandler } from "./tv-handler-type"

export function isPdfReader(): boolean {
  return window.location.href.match(/pdf-reader.html$/g) ? true : false
}

function pdfReaderElementGetter(): Array<Element> | null {
  return Array.from(document.querySelectorAll('#text-layer span'))
}

// FIXME: the above version captures all the text even in the two columns
// but the below version does a better job of not breaking in the middle of 
// lines - reconcile the two

// function pdfReaderElementGetter(): Array<Element> | null {
//   const textLayer = document.getElementById('text-layer') as HTMLDivElement
//   return [textLayer]
// }

export const pdfReaderHandler: TvHandler = {
  getTvElements: pdfReaderElementGetter,
  getScrollableElement: () => undefined
}

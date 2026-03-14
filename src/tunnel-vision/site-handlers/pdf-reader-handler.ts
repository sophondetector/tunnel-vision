import { TvHandler } from "./tv-handler-type"

export function isPdfReader(): boolean {
  return window.location.href.match(/pdf-reader.html$/g) ? true : false
}

function pdfReaderElementGetter(): Array<Element> | null {
  return Array.from(document.querySelectorAll('#text-layer span'))
}

function pdfReaderScrollableElement(): Element {
  return document.querySelector('main') as Element
}

export const pdfReaderHandler: TvHandler = {
  getTvElements: pdfReaderElementGetter,
  getScrollableElement: pdfReaderScrollableElement
}

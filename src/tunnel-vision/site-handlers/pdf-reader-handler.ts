import { blankDelay, TvHandler } from "./handler-utilities"

export function isPdfReader(): boolean {
  return window.location.href.match(/pdf-reader.html$/g) ? true : false
}

async function pdfReaderElementGetter(): Promise<Element[] | null> {
  return Array.from(document.querySelectorAll('#text-layer span'))
}

async function pdfReaderScrollableElement(): Promise<Element> {
  return document.querySelector('main') as Element
}

export const pdfReaderHandler: TvHandler = {
  getTvElements: pdfReaderElementGetter,
  getScrollableElement: pdfReaderScrollableElement,
  initDelay: blankDelay,
  mutationHandler: null
}

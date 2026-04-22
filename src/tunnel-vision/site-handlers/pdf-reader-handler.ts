import { blankDelay, TvHandler } from "./handler-utilities"

export function isPdfReader(): boolean {
  return window.location.href.match(/pdf-reader.html$/g) ? true : false
}

async function pdfReaderElementGetter(): Promise<Element[]> {
  const res = Array.from(document.querySelectorAll('#text-layer span'))
  if (res.length === 0) {
    throw new Error(`pdfReaderHandler.getTvElements: could not get text layer`)
  }
  return res
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

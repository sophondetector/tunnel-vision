import { TvHandler } from "./tv-handler-type"

export function isPdfReader(): boolean {
  return window.location.href.match(/pdf-reader.html$/g) ? true : false
}

function pdfReaderElementGetter(): Array<Element> | null {
  const textLayer = document.getElementById('text-layer') as HTMLDivElement
  return [textLayer]
}

export const pdfReaderHandler: TvHandler = {
  getTvElements: pdfReaderElementGetter,
  getScrollableElement: () => undefined
}

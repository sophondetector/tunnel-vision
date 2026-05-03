import { TvHandler } from "../tunnel-vision-core/tunnel-vision/common"
import { blankDelay } from "./handler-utilities"

export function isPdfReader(): boolean {
  return window.location.href.match(/pdf-reader.html$/g) ? true : false
}

async function pdfReaderElementGetter(): Promise<Element[]> {
  const res = Array.from(document.querySelectorAll('#text-layer span'))
  if (res.length === 0) {
    // NOTE: throwing here prevents it from falling back on the genericHandler which will just grab everything under document.body including the menus
    throw new Error(`pdfReaderHandler.getTvElements: could not get text layer`)
  }
  return res
}

export const pdfReaderHandler: TvHandler = {
  handlerName: 'Tunnel Vision PDF Reader',
  getTvElements: pdfReaderElementGetter,
  initDelay: blankDelay,
}

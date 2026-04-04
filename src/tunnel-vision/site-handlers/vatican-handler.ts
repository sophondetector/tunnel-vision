import { blankDelay, TvHandler } from "./handler-utilities"

export function vaticanElementGetter(): Array<Element> | null {
  const mainContent = document.querySelector('.documento')
  if (!mainContent) {
    console.log(`vaticanElementGetter: could not find mainContent`)
    return null
  }
  return [mainContent]
}

export const vaticanHandler: TvHandler = {
  getTvElements: vaticanElementGetter,
  getScrollableElement: () => undefined,
  initDelay: blankDelay
}

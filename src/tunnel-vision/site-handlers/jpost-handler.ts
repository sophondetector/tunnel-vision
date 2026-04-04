import { TvHandler, blankDelay } from "./handler-utilities"

function jpostElementGetter(): Array<Element> | null {
  const content = Array.from(document.querySelectorAll('article'))
  if (content.length == 0) {
    return null
  }
  return content
}

export const jpostHandler: TvHandler = {
  getTvElements: jpostElementGetter,
  getScrollableElement: () => undefined,
  initDelay: blankDelay
}

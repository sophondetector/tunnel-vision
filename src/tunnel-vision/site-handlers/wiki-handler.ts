import { blankDelay, TvHandler } from "./handler-utilities"

export const wikipediaHandler: TvHandler = {
  getTvElements: () => {
    const main = document.querySelector('#mw-content-text')
    if (!main) return null
    return [main]
  },
  getScrollableElement: () => null,
  initDelay: blankDelay
}


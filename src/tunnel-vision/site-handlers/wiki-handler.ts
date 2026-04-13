import { blankDelay, TvHandler } from "./handler-utilities"

export const wikipediaHandler: TvHandler = {
  getTvElements: async () => {
    const main = document.querySelector('#mw-content-text')
    if (!main) return null
    return [main]
  },
  getScrollableElement: async () => null,
  initDelay: blankDelay,
  mutationHandler: null
}


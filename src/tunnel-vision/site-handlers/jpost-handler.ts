import { TvHandler, blankDelay } from "./handler-utilities"

async function jpostElementGetter(): Promise<Element[] | null> {
  const content = Array.from(document.querySelectorAll('article'))
  if (content.length == 0) {
    return null
  }
  return content
}

export const jpostHandler: TvHandler = {
  getTvElements: jpostElementGetter,
  getScrollableElement: async () => null,
  initDelay: blankDelay,
  mutationHandler: null
}

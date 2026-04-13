import { TvHandler, blankDelay } from "./handler-utilities"

async function mdnElementGetter(): Promise<Element[] | null> {
  let mainContent;

  mainContent = document.querySelector('article')
  if (mainContent) return [mainContent]

  return null
}

export const mdnHandler: TvHandler = {
  getTvElements: mdnElementGetter,
  getScrollableElement: async () => null,
  initDelay: blankDelay,
  mutationHandler: null
}

import { TvHandler, blankDelay } from "./handler-utilities"

function mdnElementGetter(): Array<Element> | null {
  let mainContent;

  mainContent = document.querySelector('article')
  if (mainContent) return [mainContent]

  return null
}

export const mdnHandler: TvHandler = {
  getTvElements: mdnElementGetter,
  getScrollableElement: () => null,
  initDelay: blankDelay
}

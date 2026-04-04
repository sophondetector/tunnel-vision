import { defaultBlankDelay, TvHandler } from "./handler-utilities"

function redditElementGetter(): Array<Element> | null {
  const res = []

  const mainContent = document.querySelector('#main-content')
  if (mainContent) {
    res.push(mainContent)
  }

  const comments = document.querySelector('#comment-tree p')
  if (comments) {
    res.push(...Array(comments))
  }

  if (res.length > 0) {
    return res
  }

  return null
}

export const redditHandler: TvHandler = {
  getTvElements: redditElementGetter,
  getScrollableElement: () => undefined,
  initDelay: defaultBlankDelay
}


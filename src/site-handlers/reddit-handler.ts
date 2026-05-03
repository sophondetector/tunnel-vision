import { TvHandler } from "../tunnel-vision-core/tunnel-vision/common"
import { waitForDOMIdle } from "./handler-utilities"

async function getTvElements(): Promise<Element[] | null> {
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
  handlerName: 'reddit handler',
  getTvElements,
  initDelay: async () => waitForDOMIdle(100),
}

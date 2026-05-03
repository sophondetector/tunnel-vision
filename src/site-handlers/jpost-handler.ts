import { TvHandler } from "../tunnel-vision-core/tunnel-vision/common"
import { blankDelay } from "./handler-utilities"

async function jpostElementGetter(): Promise<Element[] | null> {
  const content = Array.from(document.querySelectorAll('article'))
  if (content.length == 0) {
    return null
  }
  return content
}

export const jpostHandler: TvHandler = {
  handlerName: 'Jerusalem Post',
  getTvElements: jpostElementGetter,
  initDelay: blankDelay,
}

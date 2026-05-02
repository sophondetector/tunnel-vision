import { TvHandler } from "../tunnel-vision-core/tunnel-vision/handler-interface"
import {
  waitForSelector,
  waitForDOMIdle
} from "./handler-utilities"

// FIXME: the x handler is extremely buggy
const PARAGRAPH_LEC = "div[data-testid='tweetText'] span"

async function getTvElements(): Promise<Element[] | null> {
  const arr = Array.from(document.querySelectorAll(PARAGRAPH_LEC))
  if (arr.length > 0) return arr
  return null
}

async function initDelay(): Promise<void> {
  await waitForSelector(PARAGRAPH_LEC, document.body)
  await waitForDOMIdle(50)
  console.log('x-handler initDelay: finished')
  return
}

export const xHandler: TvHandler = {
  handlerName: 'X handler',
  getTvElements,
  initDelay,
}

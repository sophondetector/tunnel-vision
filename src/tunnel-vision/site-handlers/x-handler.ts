import { TvDirector } from "../tv-director"
import {
  TvHandler,
  waitForSelector,
  mutationsContainAddedText,
  waitForDOMIdle
} from "./handler-utilities"

// FIXME: the x handler is extremely buggy
const SCROLLABLE_LEC = "div[data-testid='primaryColumn']"
const PARAGRAPH_LEC = "div[data-testid='tweetText'] span"

function getTvElements(): Array<Element> | null {
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

function getScrollableElement(): Element | null {
  return document.querySelector(SCROLLABLE_LEC)
}

async function mutationCallback(curDir: TvDirector, mutations: Array<MutationRecord>): Promise<void> {
  if (!(await mutationsContainAddedText(mutations))) return
  await waitForDOMIdle(10)
  await curDir.reInitRanges()
  // console.log('re-initted ranges inside mutation callback')
}

function getMutationTarget(): Node | null {
  return document.querySelector(SCROLLABLE_LEC)
}


export const xHandler: TvHandler = {
  getTvElements,
  getScrollableElement,
  initDelay,
  mutationHandler: {
    mutationCallback,
    getMutationTarget
  }
}

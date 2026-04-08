import { TvDirector } from "../tv-director"
import { TvHandler, waitForSelector } from "./handler-utilities"

// FIXME: the x handler is extremely buggy

let MUTATION_DEBOUNCE_ID: undefined | number = undefined
let MUTATION_DEBOUNCE_TIME = 100
// TODO: consider moving all the scrolling machinery into types-and-utilities and making it generalizable
let LAST_SCROLL: undefined | number = undefined
let SCROLL_INTERVAL = 5000

const SCROLLABLE_LEC = "div[data-testid='primaryColumn']"
const PARAGRAPH_LEC = "div[data-testid='tweetText'] span"


function scrollEndCallback(): void {
  LAST_SCROLL = Date.now()
}


function setScrollListener(): void {
  window.addEventListener('scrollend', scrollEndCallback, {
    passive: true
  })
}


function hasScrolledRecently(): boolean {
  if (LAST_SCROLL === undefined) return false
  return Date.now() - LAST_SCROLL <= SCROLL_INTERVAL
}


function getTvElements(): Array<Element> | null {
  const arr = Array.from(document.querySelectorAll(PARAGRAPH_LEC))
  if (arr.length > 0) return arr
  return null
}

// NOTE: this function is being used as an init function for the page handler
async function initDelay(): Promise<void> {

  setScrollListener()

  await waitForSelector(PARAGRAPH_LEC, document.body)

  console.log('x-handler initDelay: finished')

  return
}

function getScrollableElement(): Element | null {
  return document.querySelector(SCROLLABLE_LEC)
}

function mutationCallback(curDir: TvDirector, mutations: Array<MutationRecord>): void {
  if (!hasScrolledRecently()) return

  const inner = () => {
    clearTimeout(MUTATION_DEBOUNCE_ID)
    MUTATION_DEBOUNCE_ID = setTimeout(() => {
      console.log('x-handler mutationCallback - (re)initing ranges')
      curDir.initRanges()
    }, MUTATION_DEBOUNCE_TIME) as unknown as number
  }

  for (const mut of mutations) {
    if (mut.addedNodes.length < 1) continue

    for (const an of mut.addedNodes) {
      if (an.parentElement?.querySelector(PARAGRAPH_LEC)) {
        inner()
        return
      }
    }
  }

  return
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

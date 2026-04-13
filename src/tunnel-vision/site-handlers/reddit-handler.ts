import { waitForDOMIdle, TvHandler, mutationsContainAddedText } from "./handler-utilities"
import { TvDirector } from "../tv-director"

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

async function mutationCallback(curDir: TvDirector, mutations: Array<MutationRecord>): Promise<void> {
  if (!(await mutationsContainAddedText(mutations))) return
  await waitForDOMIdle(10)
  await curDir.reInitRanges()
  // console.log('re-initted ranges inside mutation callback')
}

function getMutationTarget(): Node | null {
  return document.querySelector('#main-content')
}

export const redditHandler: TvHandler = {
  getTvElements,
  getScrollableElement: async () => null,
  initDelay: async () => waitForDOMIdle(100),
  mutationHandler: {
    mutationCallback,
    getMutationTarget
  }
}

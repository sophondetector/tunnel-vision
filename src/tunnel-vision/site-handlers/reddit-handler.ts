import { waitForDOMIdle, TvHandler } from "./handler-utilities"
import { TvDirector } from "../tv-director"

function getTvElements(): Array<Element> | null {
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

function mutationCallback(_curDir: TvDirector, mutations: Array<MutationRecord>): void {
  let idx = 0
  for (const mut of mutations) {
    if (mut.addedNodes.length > 0) {
      for (const node of mut.addedNodes) {
        if (node.textContent && node.textContent.length > 0) {
          console.log(idx++, node.textContent.trim().replace(/\s+/g, ' '))
        }
      }
    }
  }
}

function getMutationTarget(): Node | null {
  return document.querySelector('#main-content')
}

export const redditHandler: TvHandler = {
  getTvElements,
  getScrollableElement: () => null,
  initDelay: async () => waitForDOMIdle(100),
  mutationHandler: {
    mutationCallback,
    getMutationTarget
  }
}

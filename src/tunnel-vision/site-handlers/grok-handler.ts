import { TvHandler, waitForNetworkIdle } from "./handler-utilities"

function grokElementGetter(): Array<Element> | null {
  const content = document.querySelector('main')
  if (!content) return null
  return [content]
}

function grokGetScrollable(): Element | undefined {
  return document.querySelector('main div.scrollbar-gutter-stable') ?? undefined
}

export const grokHandler: TvHandler = {
  getTvElements: grokElementGetter,
  getScrollableElement: grokGetScrollable,
  initDelay: async () => {
    await waitForNetworkIdle(300, 10_000, 0)
    // console.log('grokHandler.initDelay: done!')
  }
}

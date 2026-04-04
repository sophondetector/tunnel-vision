import { TvHandler } from "./tv-handler-type"

const GROK_DELAY_TIME = 2000

function grokElementGetter(): Array<Element> | null {
  const content = document.querySelector('main')
  if (!content) return null
  return [content]
}

// TODO: make grok delayer more sophisticated
function grokDelayer(): Promise<void> {
  return new Promise(
    (res) => {
      setTimeout(
        () => {
          console.log('grokHandler.initDelay: done waiting for page to load')
          res()
        },
        GROK_DELAY_TIME
      )
    }
  )
}

function grokGetScrollable(): Element | undefined {
  return document.querySelector('main div.scrollbar-gutter-stable') ?? undefined
}


export const grokHandler: TvHandler = {
  getTvElements: grokElementGetter,
  getScrollableElement: grokGetScrollable,
  initDelay: grokDelayer
}

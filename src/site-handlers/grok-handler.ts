import { TvHandler } from "../tunnel-vision-core"
import { waitForNetworkIdle } from "./handler-utilities"

async function getTvElements(): Promise<Element[] | null> {
  const content = document.querySelector('main')
  if (!content) return null
  return [content]
}

export const grokHandler: TvHandler = {
  handlerName: 'grokHandler',
  getTvElements,
  initDelay: async () => {
    await waitForNetworkIdle(300, 10_000, 0)
    // console.log('grokHandler.initDelay: done!')
  }
}

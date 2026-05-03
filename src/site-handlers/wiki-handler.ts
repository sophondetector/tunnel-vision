import { TvHandler } from "../tunnel-vision-core/tunnel-vision/common"
import { blankDelay } from "./handler-utilities"

export const wikipediaHandler: TvHandler = {
  handlerName: 'wikipedia handler',
  getTvElements: async () => {
    const main = document.querySelector('#mw-content-text')
    if (!main) return null
    return [main]
  },
  initDelay: blankDelay,
}


import {
  waitForNetworkIdle,
  waitForDOMIdle,
} from "./handler-utilities"
import { TvHandler } from "../tunnel-vision-core"

export const genericHandler: TvHandler = {
  handlerName: 'genericHandler',
  getTvElements: async () => [document.body],
  initDelay: async () => {
    await waitForNetworkIdle(100, 5000, 0)
    await waitForDOMIdle(50)
    console.log('genericHandler.initDelay: done!')
  }
}

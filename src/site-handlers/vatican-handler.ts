import { TvHandler } from "../tunnel-vision-core/tunnel-vision/handler-interface"
import { blankDelay } from "./handler-utilities"

export const vaticanHandler: TvHandler = {
  handlerName: 'Vatican Handler',
  getTvElements: async () => [document.body],
  initDelay: blankDelay,
}

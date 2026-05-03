import { TvHandler } from "../tunnel-vision-core/tunnel-vision/common"
import { blankDelay } from "./handler-utilities"

export const vaticanHandler: TvHandler = {
  handlerName: 'Vatican Handler',
  getTvElements: async () => [document.body],
  initDelay: blankDelay,
}

import { blankDelay, TvHandler } from "./handler-utilities"

export const vaticanHandler: TvHandler = {
  getTvElements: async () => [document.body],
  getScrollableElement: async () => null,
  initDelay: blankDelay,
  mutationHandler: null
}

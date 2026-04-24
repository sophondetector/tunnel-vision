import {
  TvHandler,
  waitForNetworkIdle,
  waitForDOMIdle,
  discoverScrollableFromCenterPromise,
  defaultMutationHandler
} from "./handler-utilities"

export const genericHandler: TvHandler = {
  getTvElements: async () => [document.body],
  // TODO: remove scrollable element handling from handlers; that's now handled dynamically per range
  getScrollableElement: discoverScrollableFromCenterPromise,
  initDelay: async () => {
    await waitForNetworkIdle(100, 5000, 0)
    await waitForDOMIdle(50)
    console.log('genericHandler.initDelay: done!')
  },
  mutationHandler: defaultMutationHandler
  // TODO: remove mutation handler from handlers
}

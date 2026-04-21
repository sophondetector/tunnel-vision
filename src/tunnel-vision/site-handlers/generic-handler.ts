import {
  TvHandler,
  waitForNetworkIdle,
  waitForDOMIdle,
  discoverScrollableFromCenterPromise,
  defaultMutationHandler
} from "./handler-utilities"

// FIXME: for generic handler (and maybe all handlers?) create a function where if a range is contained in another range then remove the containing range

export const genericHandler: TvHandler = {
  getTvElements: async () => [document.body],
  getScrollableElement: discoverScrollableFromCenterPromise,
  initDelay: async () => {
    await waitForNetworkIdle(100, 5000, 0)
    await waitForDOMIdle(50)
    console.log('genericHandler.initDelay: done!')
  },
  mutationHandler: defaultMutationHandler
}

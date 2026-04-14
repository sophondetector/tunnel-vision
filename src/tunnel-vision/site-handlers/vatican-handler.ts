import { blankDelay, TvHandler } from "./handler-utilities"

// TODO: maybe switch this back on or maybe just get rid of site handlers entirely - idk

// async function vaticanElementGetter(): Promise<Element[] | null> {
//   const mainContent = document.querySelector('.documento')
//   if (!mainContent) {
//     console.log(`vaticanElementGetter: could not find mainContent`)
//     return null
//   }
//   return [mainContent]
// }

export const vaticanHandler: TvHandler = {
  getTvElements: async () => [document.body],
  getScrollableElement: async () => null,
  initDelay: blankDelay,
  mutationHandler: null
}

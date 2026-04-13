import { blankDelay, TvHandler } from "./handler-utilities"

async function vaticanElementGetter(): Promise<Element[] | null> {
  const mainContent = document.querySelector('.documento')
  if (!mainContent) {
    console.log(`vaticanElementGetter: could not find mainContent`)
    return null
  }
  return [mainContent]
}

export const vaticanHandler: TvHandler = {
  getTvElements: vaticanElementGetter,
  getScrollableElement: async () => null,
  initDelay: blankDelay,
  mutationHandler: null
}

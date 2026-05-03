import { TvHandler } from "../tunnel-vision-core/tunnel-vision/common"
import { blankDelay } from "./handler-utilities"

export function isActuallySubstack(): boolean {
  return document.querySelector('link[href="https://substackcdn.com"]') ? true : false
}

async function substackElementGetter(): Promise<Element[] | null> {
  let mainContent;

  mainContent = document.querySelectorAll('h1, h3, p, .captioned-image-container, a.weight-bold-DmI9lw')
  if (mainContent.length > 0) {
    return Array(...mainContent)
  }

  mainContent = document.querySelector('#entry > div.reader-nav-root.reader2-font-base > div.reader-nav-page')
  if (mainContent) return [mainContent]

  return null
}

export const substackHandler: TvHandler = {
  handlerName: 'Substack Handler',
  getTvElements: substackElementGetter,
  initDelay: blankDelay,
}

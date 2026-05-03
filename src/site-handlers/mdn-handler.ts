import { TvHandler } from "../tunnel-vision-core"
import { blankDelay } from "./handler-utilities"

async function mdnElementGetter(): Promise<Element[] | null> {
  let mainContent;

  mainContent = document.querySelector('article')
  if (mainContent) return [mainContent]

  return null
}

export const mdnHandler: TvHandler = {
  handlerName: 'Mozilla Development Network',
  getTvElements: mdnElementGetter,
  initDelay: blankDelay,
}

import { sleep } from "../../common";
import { TvHandler } from "./handler-utilities"

async function mdnElementGetter(): Promise<Element[] | null> {
  let mainContent;

  mainContent = document.querySelector('article')
  if (mainContent) return [mainContent]

  return null
}

export const mdnHandler: TvHandler = {
  getTvElements: mdnElementGetter,
  getScrollableElement: async () => null,
  initDelay: async () => sleep(1000),
  mutationHandler: null
}

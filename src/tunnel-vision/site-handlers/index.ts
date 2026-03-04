import { genericHandler } from "./generic-handler"
import { mdnHandler } from "./mdn-handler"
import { redditHandler } from "./reddit-handler"
import { substackHandler, isActuallySubstack } from "./substack-handler"
import { vaticanHandler } from "./vatican-handler"
import { wikipediaHandler } from "./wiki-handler"
import { jpostHandler } from "./jpost-handler"
import { TvHandler } from "./tv-handler-type"
import { pdfReaderHandler, isPdfReader } from "./pdf-reader-handler"

// TODO: make handlers able to discriminate by subdomain
const DOMAIN_HANDLER_MAP: Map<string, TvHandler> = new Map()

DOMAIN_HANDLER_MAP.set("vatican.va", vaticanHandler)
DOMAIN_HANDLER_MAP.set("wikipedia.org", wikipediaHandler)
DOMAIN_HANDLER_MAP.set("mozilla.org", mdnHandler)
DOMAIN_HANDLER_MAP.set("substack.com", substackHandler)
DOMAIN_HANDLER_MAP.set("reddit.com", redditHandler)
DOMAIN_HANDLER_MAP.set("jpost.com", jpostHandler)

const SUPPORTED_DOMAINS = Array.from(DOMAIN_HANDLER_MAP.keys())

export class HandlerManager {
  static getHandler(): TvHandler {

    if (isPdfReader()) {
      console.log("HandlerManager.getHander: it's PDF time")
      return pdfReaderHandler
    }

    const topLevelHost = HandlerManager.getTopLevelHost()

    if (isActuallySubstack()) {
      console.log(`HandlerManager.getHandler: ${topLevelHost} is substack - using substack handler...`)
      return substackHandler
    }

    let handler: TvHandler | undefined

    if (SUPPORTED_DOMAINS.includes(topLevelHost)) {
      console.log(`HandlerManager.getHandler: ${topLevelHost} supported!`)
      handler = DOMAIN_HANDLER_MAP.get(topLevelHost)
    } else {
      console.log(`HandlerManager.getHandler: ${topLevelHost} not supported; using generic handler`)
      handler = genericHandler
    }

    if (!handler) {
      throw new Error(`HandlerManager.getHandler: could not get handler for ${topLevelHost}!`)
    } else {
      console.log(`HandlerManager.getHandler: got handler for ${topLevelHost}`)
    }

    return handler
  }

  static getEleArray(): Array<Element> | null {
    const handler = HandlerManager.getHandler()
    let ea = handler.getTvElements()
    if (!ea || ea.length == 0) {
      console.warn(`getEleArray: hander failed: falling back on generic handler`)
      ea = genericHandler.getTvElements()
      if (!ea || ea.length == 0) {
        console.error(`getEleArray: generic handler fallback also failed`)
        return null
      }
    }
    return ea
  }

  static getScrollableElement(): Element | undefined {
    const handler = HandlerManager.getHandler()
    return handler.getScrollableElement()
  }

  static getTopLevelHost(): string {
    return window.location.host.match(/\w+\.\w+$/g)![0]
  }
}

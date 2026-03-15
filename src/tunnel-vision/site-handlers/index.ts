import { genericHandler } from "./generic-handler"
import { mdnHandler } from "./mdn-handler"
import { redditHandler } from "./reddit-handler"
import { substackHandler, isActuallySubstack } from "./substack-handler"
import { vaticanHandler } from "./vatican-handler"
import { wikipediaHandler } from "./wiki-handler"
import { jpostHandler } from "./jpost-handler"
import { TvHandler } from "./tv-handler-type"
import { pdfReaderHandler, isPdfReader } from "./pdf-reader-handler"
import { grokHandler } from "./grok-handler"

// TODO: make handlers able to discriminate by subdomain
const DOMAIN_HANDLER_MAP: Map<string, TvHandler> = new Map()

DOMAIN_HANDLER_MAP.set("vatican.va", vaticanHandler)
DOMAIN_HANDLER_MAP.set("wikipedia.org", wikipediaHandler)
DOMAIN_HANDLER_MAP.set("mozilla.org", mdnHandler)
DOMAIN_HANDLER_MAP.set("substack.com", substackHandler)
DOMAIN_HANDLER_MAP.set("reddit.com", redditHandler)
DOMAIN_HANDLER_MAP.set("jpost.com", jpostHandler)
DOMAIN_HANDLER_MAP.set("grok.com", grokHandler)

const SUPPORTED_DOMAINS = Array.from(DOMAIN_HANDLER_MAP.keys())

let HANDLER: TvHandler | null = null

export class HandlerManager {
  static getHandler(): TvHandler | null {
    if (HANDLER) {
      return HANDLER
    }

    if (isPdfReader()) {
      console.log("HandlerManager.getHandler: it's PDF time")
      HANDLER = pdfReaderHandler
      return HANDLER
    }

    const topLevelHost = HandlerManager.getTopLevelHost()
    if (topLevelHost === null) {
      return null
    }

    if (isActuallySubstack()) {
      console.log(`HandlerManager.getHandler: ${topLevelHost} is substack - using substack handler...`)
      HANDLER = substackHandler
      return HANDLER
    }

    if (SUPPORTED_DOMAINS.includes(topLevelHost)) {
      console.log(`HandlerManager.getHandler: ${topLevelHost} supported!`)
      HANDLER = DOMAIN_HANDLER_MAP.get(topLevelHost) ?? null
    } else {
      console.log(`HandlerManager.getHandler: ${topLevelHost} not supported; using generic handler`)
      HANDLER = genericHandler
    }

    if (HANDLER === null) {
      console.error(`HandlerManager.getHandler: could not get handler for ${topLevelHost}!`)
      return null
    }

    return HANDLER
  }

  static getEleArray(): Array<Element> | null {
    const handler = HandlerManager.getHandler()
    if (handler === null) return null

    let ea = handler.getTvElements()
    if (!ea || ea.length == 0) {
      console.warn(`getEleArray: handler failed: falling back on generic handler`)
      ea = genericHandler.getTvElements()
      if (!ea || ea.length == 0) {
        console.error(`getEleArray: generic handler fallback also failed`)
        return null
      }
    }
    return ea
  }

  static getScrollableElement(): Element | undefined | null {
    const handler = HandlerManager.getHandler()
    if (handler === null) return null
    return handler.getScrollableElement()
  }

  static getTopLevelHost(): string | null {
    const host = window.location.host
    const res = host.match(/\w+\.\w+$/g)
    if (res === null || res.length < 1) {
      console.error(`getTopLevelHost: could not get top level host from ${host}`)
      return null
    }
    return res[0]
  }
}

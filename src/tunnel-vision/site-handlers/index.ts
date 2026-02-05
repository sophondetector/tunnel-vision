import { genericHandler } from "./generic-handler"
import { mdnHandler } from "./mdn-handler"
import { redditHandler } from "./reddit-handler"
import { substackHandler, isActuallySubstack } from "./substack-handler"
import { vaticanHandler } from "./vatican-handler"
import { wikipediaHandler } from "./wiki-handler"
import { TvHandler } from "./tv-handler-type"

// TODO make handlers able to discriminate by subdomain
const GENERIC_HANDLER_KEY: string = "GENERIC"
const DOMAIN_HANDLER_MAP: Map<string, TvHandler> = new Map()

DOMAIN_HANDLER_MAP.set(GENERIC_HANDLER_KEY, genericHandler)
DOMAIN_HANDLER_MAP.set("vatican.va", vaticanHandler)
DOMAIN_HANDLER_MAP.set("wikipedia.org", wikipediaHandler)
DOMAIN_HANDLER_MAP.set("mozilla.org", mdnHandler)
DOMAIN_HANDLER_MAP.set("substack.com", substackHandler)
DOMAIN_HANDLER_MAP.set("reddit.com", redditHandler)

const SUPPORTED_DOMAINS = Array.from(DOMAIN_HANDLER_MAP.keys())

export class HandlerManager {
  static getHandler(): TvHandler {

    const topLevelHost = HandlerManager.getTopLevelHost()

    let handler: TvHandler | undefined

    if (SUPPORTED_DOMAINS.includes(topLevelHost)) {
      handler = DOMAIN_HANDLER_MAP.get(topLevelHost)
    } else {
      console.log(`HandlerManager.getHandler: ${topLevelHost} not supported; using generic handler`)
      handler = DOMAIN_HANDLER_MAP.get(GENERIC_HANDLER_KEY)
    }

    if (isActuallySubstack()) {
      console.log(`HandlerManager.getHandler: ${topLevelHost} found to be actually substack...`)
      console.log(`HandlerManager.getHandler: using substack handler`)
      return substackHandler
    }

    if (!handler) {
      throw new Error(`HandlerManager.getHandler: could not get handler!`)
    }

    return handler
  }

  static getEleArray(): Array<Element> | null {
    const handler = HandlerManager.getHandler()
    const ea = handler.getTvElements()
    if (!ea) {
      console.log(`HandlerManager.getEleArray: elementArray from handler is ${ea}!`)
      return null
    }
    if (ea.length < 1) {
      console.log(`HandlerManager.getEleArray: empty element array from handler!`)
      return null
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

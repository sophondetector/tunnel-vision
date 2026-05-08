import { genericHandler } from "./generic-handler"
import { redditHandler } from "./reddit-handler"
import { substackHandler, isActuallySubstack } from "./substack-handler"
import { vaticanHandler } from "./vatican-handler"
import { wikipediaHandler } from "./wiki-handler"
import { jpostHandler } from "./jpost-handler"
import { TvHandler } from "../tunnel-vision-core"
import { pdfReaderHandler, isPdfReader } from "./pdf-reader-handler"
import { grokHandler } from "./grok-handler"
import { xHandler } from "./x-handler"

const DOMAIN_HANDLER_MAP: Map<string, TvHandler> = new Map()

DOMAIN_HANDLER_MAP.set("vatican.va", vaticanHandler)
DOMAIN_HANDLER_MAP.set("wikipedia.org", wikipediaHandler)
DOMAIN_HANDLER_MAP.set("substack.com", substackHandler)
DOMAIN_HANDLER_MAP.set("reddit.com", redditHandler)
DOMAIN_HANDLER_MAP.set("jpost.com", jpostHandler)
DOMAIN_HANDLER_MAP.set("grok.com", grokHandler)
DOMAIN_HANDLER_MAP.set("x.com", xHandler)

const SUPPORTED_DOMAINS = Array.from(DOMAIN_HANDLER_MAP.keys())

let HANDLER: TvHandler | null = null

export class UberHandler implements TvHandler {
  handlerName: string = "UberHandler"

  constructor() {
    const handler = UberHandler.#getHandler()
    this.handlerName += ` - ${handler.handlerName}`
  }

  static #getHandler(): TvHandler {
    if (HANDLER) return HANDLER

    const topLevelHost = UberHandler.#getTopLevelHost()

    if (topLevelHost === null) {
      console.warn('getHandler: no top level host! returning generic handler')
      HANDLER = genericHandler

    } else if (SUPPORTED_DOMAINS.includes(topLevelHost)) {
      console.log(`getHandler: ${topLevelHost} supported!`)
      HANDLER = DOMAIN_HANDLER_MAP.get(topLevelHost) as TvHandler

    } else if (isPdfReader()) {
      HANDLER = pdfReaderHandler

    } else if (isActuallySubstack()) {
      console.log(`getHandler: ${topLevelHost} is substack - using substack handler...`)
      HANDLER = substackHandler

    } else {
      console.warn('all handler signals failed, returning genericHandler')
      HANDLER = genericHandler
    }

    return HANDLER as TvHandler
  }

  async getTvElements(): Promise<Element[] | null> {
    const handler = UberHandler.#getHandler()
    const elementArray = await handler.getTvElements()
    if (elementArray && elementArray.length > 0) return elementArray
    return genericHandler.getTvElements()
  }

  async initDelay(): Promise<void> {
    return UberHandler.#getHandler().initDelay()
  }

  static #getTopLevelHost(): string | null {
    const host = window.location.host
    const res = host.match(/\w+\.\w+$/g)
    if (res === null || res.length < 1) {
      console.error(`getTopLevelHost: could not get top level host from ${host}`)
      return null
    }
    return res[0]
  }
}

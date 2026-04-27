import { TvDirector, TvDirectorConfig } from "./tunnel-vision/tv-director"
import { TvMessage } from "./common"
import { TvHandler } from "./tunnel-vision/site-handlers/handler-utilities"
import { pdfReaderHandler } from "./tunnel-vision/site-handlers/pdf-reader-handler"
import { ChromeExtensionSoundController } from "./tunnel-vision/sound-for-extension"
import { WebAppSoundController } from "./tunnel-vision/sound-for-app"

let DIRECTOR: TvDirector | null = null

// NOTE: This must call sendResponse on every path to prevent the following error: "Unchecked runtime.lastError: The message port closed before a response was received."
function controlPanelListenerCallback(value: string, sender: string, sendResponse: CallableFunction) {
  if (DIRECTOR === null) {
    console.error(`controlPanelListenerCallback: Director is null!`)
    sendResponse()
    return
  }

  if (value === TvMessage.TOGGLE_SCREEN) {
    DIRECTOR.toggleScreen()
    sendResponse()

  } else if (value === TvMessage.GET_SCREEN_STATE) {
    const stateResponse = DIRECTOR.getScreenState()
    sendResponse(stateResponse)

    //pure number means its opacity
  } else if (value.match(/^\d+$/)) {
    if (!DIRECTOR.screenIsOn()) {
      sendResponse()
      return
    }
    const valueNum = Number(value)
    DIRECTOR.setScreenOpacity(valueNum)
    sendResponse()

    // if its a color
  } else if (value.match(/^#[0-9a-f]{6}$/)) {
    if (!DIRECTOR.screenIsOn()) {
      sendResponse()
    }
    DIRECTOR.setScreenColor(value)
    sendResponse()

  } else if (value === TvMessage.GET_DIRECTOR_STATE) {
    const dirState = DIRECTOR.getDirectorState()
    sendResponse(dirState)

  } else if (value === TvMessage.INIT_RANGES) {
    console.log('re-running initRanges')
    DIRECTOR.initRanges()
    sendResponse()

  } else if (value === TvMessage.RE_INIT) {
    console.log('re-initing director')
    DIRECTOR.init()
    sendResponse()

  } else if (value === TvMessage.SHOW_RANGES) {
    const onOff = DIRECTOR.toggleShowRanges()
    console.log(`show ranges is ${onOff ? "ON" : "OFF"}`)
    sendResponse()

  } else if (value === TvMessage.LOG_RANGES) {
    const onOff = DIRECTOR.getRangeManager().toggleLogRanges()
    console.log(`log ranges is ${onOff ? "ON" : "OFF"}`)
    sendResponse()

  } else if (value === TvMessage.DUMP_RANGES) {
    console.log(`dumping ranges`)
    DIRECTOR.dumpAllRanges()
    sendResponse()

  } else if (value === TvMessage.SHOW_TEXT_NODES) {
    const onOff = DIRECTOR.toggleShowTextNodes()
    console.log(`show text nodes is ${onOff ? "ON" : "OFF"}`)
    sendResponse()

  } else {
    console.error(`controlPanelListenerCallback: Unknown message! value ${value}; sender ${sender}`)
    sendResponse()
  }
}

/**
 * Initializes the TvDirector for the web app environment. Bypasses the HandlerManager by setting the pdfReaderHandler but does not set any of the chrome-extension related listeners
 */
export async function initDirectorForWebApp(): Promise<void> {
  const dir = await initDirector({
    handler: pdfReaderHandler,
    enableMutationObserver: false,
    soundController: new WebAppSoundController()
  })
  const dirState = dir.getDirectorState()
  console.log(`initDirectorForWebApp: init complete - TvDirector state is ${dirState}`)
}

/**
 * Initializes the TvDirector for the PDF part of the extension - bypasses the HandlerManager to set the pdfReaderHandler and also sets the control-panel listeners
 */
export async function initDirectorForPdfExtension(): Promise<void> {
  // FIXME: turn off mutation handling but keep chrome extension listeners
  // FIXME: if we are in the web app but the user has the chrome extension use the extension Director not the web app Director
  await initDirectorForChromeExtension(pdfReaderHandler)
}

/**
 * @param {TvHandler} handler if left unset then the HandlerManager chooses it
 * Initializes the TvDirector and the control panel listener
 */
export async function initDirectorForChromeExtension(handler: TvHandler | null = null): Promise<void> {
  // receives messages from options.ts control-panel OR receives messages from background.ts asking for icon state
  // @ts-ignore
  chrome.runtime.onMessage.addListener(controlPanelListenerCallback)
  const dir = await initDirector({
    handler: handler ?? null,
    enableMutationObserver: true,
    soundController: new ChromeExtensionSoundController()
  })
  const dirState = dir.getDirectorState()
  chrome.runtime.sendMessage(dirState)
  console.log(`initDirectorForChromeExtension: init complete - TvDirector state is ${dirState}`)
}

async function initDirector(config: TvDirectorConfig): Promise<TvDirector> {
  if (DIRECTOR !== null) {
    throw new Error('TvDirector already constructed!')
  }
  DIRECTOR = new TvDirector(config)
  await DIRECTOR.init()
  return DIRECTOR
}

// FIXME: make getDirector sync and not async
export async function getDirector(): Promise<TvDirector> {
  if (!DIRECTOR) {
    throw new Error('DIRECTOR is null!')
  }
  return DIRECTOR
}

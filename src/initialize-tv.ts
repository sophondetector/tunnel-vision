import { getDirector, initDirector } from "./tunnel-vision-core/tunnel-vision/tv-director"
import { TvMessage } from "./chrome-helpers"
import { pdfReaderHandler } from "./site-handlers/pdf-reader-handler"
import { ChromeExtensionSoundController } from "./sound-for-extension"
import { UberHandler } from "./site-handlers"

// NOTE: This must call sendResponse on every path to prevent the following error: "Unchecked runtime.lastError: The message port closed before a response was received."
function controlPanelListenerCallback(value: string, sender: string, sendResponse: CallableFunction) {
  const dir = getDirector()

  if (dir === null) {
    console.error(`controlPanelListenerCallback: Director is null!`)
    sendResponse()
    return
  }

  if (value === TvMessage.TOGGLE_SCREEN) {
    dir.toggleScreen()
    sendResponse()

  } else if (value === TvMessage.GET_SCREEN_STATE) {
    const stateResponse = dir.getScreenState()
    sendResponse(stateResponse)

    //pure number means its opacity
  } else if (value.match(/^\d+$/)) {
    if (!dir.screenIsOn()) {
      sendResponse()
      return
    }
    const valueNum = Number(value)
    dir.setScreenOpacity(valueNum)
    sendResponse()

    // if its a color
  } else if (value.match(/^#[0-9a-f]{6}$/)) {
    if (!dir.screenIsOn()) {
      sendResponse()
    }
    dir.setScreenColor(value)
    sendResponse()

  } else if (value === TvMessage.GET_DIRECTOR_STATE) {
    const dirState = dir.getDirectorState()
    sendResponse(dirState)

  } else if (value === TvMessage.INIT_RANGES) {
    console.log('re-running initRanges')
    dir.initRanges()
    sendResponse()

  } else if (value === TvMessage.RE_INIT) {
    console.log('re-initing director')
    dir.init()
    sendResponse()

  } else if (value === TvMessage.SHOW_RANGES) {
    const onOff = dir.toggleShowRanges()
    console.log(`show ranges is ${onOff ? "ON" : "OFF"}`)
    sendResponse()

  } else if (value === TvMessage.LOG_RANGES) {
    const onOff = dir.getRangeManager().toggleLogRanges()
    console.log(`log ranges is ${onOff ? "ON" : "OFF"}`)
    sendResponse()

  } else if (value === TvMessage.DUMP_RANGES) {
    console.log(`dumping ranges`)
    dir.dumpAllRanges()
    sendResponse()

  } else if (value === TvMessage.SHOW_TEXT_NODES) {
    const onOff = dir.toggleShowTextNodes()
    console.log(`show text nodes is ${onOff ? "ON" : "OFF"}`)
    sendResponse()

  } else {
    console.error(`controlPanelListenerCallback: Unknown message! value ${value}; sender ${sender}`)
    sendResponse()
  }
}

/**
 * Initializes the TvDirector for the PDF part of the extension - bypasses the UberHandler to set the pdfReaderHandler and also sets the control-panel listeners
 */
export async function initDirectorForPdfExtension(): Promise<void> {
  // FIXME: if we are in the web app but the user has the chrome extension use the extension Director not the web app Director

  // @ts-ignore
  chrome.runtime.onMessage.addListener(controlPanelListenerCallback)
  const dir = await initDirector({
    handler: pdfReaderHandler,
    enableMutationObserver: false,
    soundController: new ChromeExtensionSoundController()
  })
  const dirState = dir.getDirectorState()
  chrome.runtime.sendMessage(dirState)
  console.log(`initDirectorForPdfExtension: init complete - TvDirector state is ${dirState}`)
}

/**
 * Initializes the TvDirector and the control panel listener
 */
export async function initDirectorForChromeExtension(): Promise<void> {
  // receives messages from options.ts control-panel OR receives messages from background.ts asking for icon state
  // @ts-ignore
  chrome.runtime.onMessage.addListener(controlPanelListenerCallback)
  const dir = await initDirector({
    handler: new UberHandler(),
    enableMutationObserver: true,
    soundController: new ChromeExtensionSoundController()
  })
  const dirState = dir.getDirectorState()
  chrome.runtime.sendMessage(dirState)
  console.log(`initDirectorForChromeExtension: init complete - TvDirector state is ${dirState}`)
}


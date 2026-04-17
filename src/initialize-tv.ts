import { TvDirector } from "./tunnel-vision/tv-director"
import { TvMessage } from "./common"

let DIRECTOR: TvDirector | null = null

// NOTE: This must call sendResponse on every path to prevent the following error:
// "Unchecked runtime.lastError: The message port closed before a response was received."
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
    if (!DIRECTOR.isOn()) {
      sendResponse()
      return
    }
    const valueNum = Number(value)
    DIRECTOR.setScreenOpacity(valueNum)
    sendResponse()

    // if its a color
  } else if (value.match(/^#[0-9a-f]{6}$/)) {
    if (!DIRECTOR.isOn()) {
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

export async function initializeTV(): Promise<void> {
  // receives messages from options.ts control-panel
  // OR receives messages from background.ts asking for icon state
  // @ts-ignore
  chrome.runtime.onMessage.addListener(controlPanelListenerCallback)
  DIRECTOR = new TvDirector()
  await DIRECTOR.init()
  const dirState = DIRECTOR.getDirectorState()
  chrome.runtime.sendMessage(dirState)
  console.log(`initializeTV: init complete - TvDirector state is ${dirState}`)
}

export async function getDirector(): Promise<TvDirector> {
  if (DIRECTOR === null) {
    DIRECTOR = new TvDirector()
    await DIRECTOR.init()
  }
  return DIRECTOR
}

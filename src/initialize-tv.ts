import { TvDirector } from "./tunnel-vision/index.js"
import { GET_STATE, TOGGLE_SCREEN, ICON_STATES } from "./common.js"

let DIRECTOR: TvDirector | null = null

// NOTE: This must call sendResponse on every path to prevent the following error:
// "Unchecked runtime.lastError: The message port closed before a response was received."
function controlPanelListenerCallback(value: string, sender: string, sendResponse: CallableFunction) {
  if (DIRECTOR === null) {
    console.error(`controlPanelListenerCallback: Director is null!`)
    sendResponse()
    return
  }

  if (value === TOGGLE_SCREEN) {
    DIRECTOR.toggleScreen()
    sendResponse()
    return

  } else if (value === GET_STATE) {
    const stateResponse = DIRECTOR.getScreenState()
    sendResponse(stateResponse)
    return

    //pure number means its opacity
  } else if (value.match(/^\d+$/)) {
    if (!DIRECTOR.isOn()) {
      sendResponse()
      return
    }
    const valueNum = Number(value)
    DIRECTOR.setScreenOpacity(valueNum)
    sendResponse()
    return

    // if its a color
  } else if (value.match(/^#[0-9a-f]{6}$/)) {
    if (!DIRECTOR.isOn()) {
      sendResponse()
      return
    }
    DIRECTOR.setScreenColor(value)
    sendResponse()
    return

  } else if (value === ICON_STATES.GET_ICON_STATE) {
    const icon_state = DIRECTOR.getIconState()
    sendResponse(icon_state)
    return

  } else {
    console.error(`controlPanelListenerCallback: Unknown message received!!`)
    console.log(`message value: ${value}`)
    console.log(`message sender: ${sender}`)
    sendResponse()
    return
  }
}

export async function initializeTV(): Promise<void> {
  // receives messages from options.ts control-panel
  // OR receives messages from background.ts asking for icon state
  // @ts-ignore
  chrome.runtime.onMessage.addListener(controlPanelListenerCallback)
  DIRECTOR = new TvDirector()
  await DIRECTOR.init()
  const iconState = DIRECTOR.getIconState()
  chrome.runtime.sendMessage(iconState)
  // TODO: if state is error grey out the control panel
  console.log(`initializeTV: init complete with state ${iconState}`)
}

export async function getDirector(): Promise<TvDirector> {
  if (DIRECTOR === null) {
    DIRECTOR = new TvDirector()
    await DIRECTOR.init()
  }
  return DIRECTOR
}
